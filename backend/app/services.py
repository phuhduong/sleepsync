"""Plan orchestration — composes risk model + optimizer + persistence.

Keeps the route layer thin. Classifier and optimizer remain independent
modules; this is just the wiring layer."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from ml.features import rollup_vector
from ml.optimizer import OptimizerConfig, optimize
from ml.risk_model import RiskCurve, RiskModel
from models.schemas import (
    FeaturesPayload,
    NightRecord,
    PlanMetadata,
    PlanRequest,
    PlanResponse,
    Profile,
    RiskPoint,
)
from storage.repositories import Repository

from .config import AppConfig


def _resolve_open_night(
    repo: Repository, request: PlanRequest
) -> tuple[str, NightRecord | None]:
    """Reuse an in-progress night (no debrief) instead of creating orphans on refresh."""
    existing: NightRecord | None = None
    if request.nightId:
        candidate = repo.db.get_night(request.nightId)
        if (
            candidate is not None
            and candidate.userId == request.userId
            and candidate.debrief is None
        ):
            existing = candidate
    if existing is None:
        existing = repo.db.find_open_night_for_user(
            request.userId, request.bedtimeMinutes, request.wakeMinutes
        )
    if existing is not None:
        return existing.nightId, existing
    return f"night-{uuid.uuid4()}", None


def build_plan(
    repo: Repository,
    risk_model: RiskModel,
    config: AppConfig,
    request: PlanRequest,
) -> PlanResponse:
    # 1. Resolve features.
    payload: FeaturesPayload | None = None
    if request.featureSetId:
        payload = repo.db.get_feature_set(request.featureSetId)
    if payload is None:
        payload = repo.db.latest_feature_set_for_user(request.userId)

    nights_available = repo.db.feature_count_for_user(request.userId)

    # 2. Risk curve.
    rv = rollup_vector(payload.rollups if payload else None)
    risk = risk_model.predict(
        payload,
        rv,
        grid_size=config.risk.grid_size,
        nights_available=nights_available,
        cold_start_threshold=config.risk.cold_start_threshold,
    )

    # 3. Optimize — reuse open night row when refreshing plan pre-debrief.
    rationale = _rationale_for(risk)
    night_id, existing = _resolve_open_night(repo, request)
    profile_id = f"generated-{datetime.now(timezone.utc).date().isoformat()}-{night_id[-6:]}"
    opt_config: OptimizerConfig = config.optimizer
    opt_result = optimize(
        risk_p=risk.p,
        t_centers=risk.t_centers,
        config=opt_config,
        rationale=rationale,
        profile_id=profile_id,
    )

    constraints_hit = list(opt_result.constraints_hit)
    if risk.cold_start:
        constraints_hit.append("cold_start")

    metadata = PlanMetadata(
        modelVersion=config.model_version,
        coldStart=risk.cold_start,
        constraintsHit=constraints_hit,
        generatedAt=datetime.now(timezone.utc),
        nightId=night_id,
    )

    risk_points = risk.as_points()

    # 4. Persist night row at plan time (feedback loop foundation).
    record = NightRecord(
        nightId=night_id,
        userId=request.userId,
        bedtimeMinutes=request.bedtimeMinutes,
        wakeMinutes=request.wakeMinutes,
        predictedRiskCurve=risk_points,
        generatedProfile=opt_result.profile,
        metadata=metadata,
        deliverySamples=existing.deliverySamples if existing else [],
        wearableOutcome=existing.wearableOutcome if existing else None,
        debrief=None,
        createdAt=existing.createdAt if existing else datetime.now(timezone.utc),
    )
    repo.db.put_night(record)

    return PlanResponse(
        nightId=night_id,
        profile=opt_result.profile,
        riskCurve=risk_points,
        metadata=metadata,
    )


def _rationale_for(risk: RiskCurve) -> str:
    if risk.cold_start:
        return (
            "Limited history: conservative curve with late ramp and strong pre-wake taper."
        )
    peak_t = risk.peak_t()
    if peak_t < 0.45:
        band = "early sleep"
    elif peak_t < 0.62:
        band = "mid-night"
    elif peak_t < 0.78:
        band = "wake-maintenance window"
    else:
        band = "pre-wake"
    return f"Higher wake risk in the {band}; sustained release with pre-wake taper."


def risk_to_points(risk: RiskCurve) -> list[RiskPoint]:
    return risk.as_points()
