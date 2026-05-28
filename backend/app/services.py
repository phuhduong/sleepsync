"""Plan orchestration — composes risk model + optimizer + persistence.

Keeps the route layer thin. Classifier and optimizer remain independent
modules; this is just the wiring layer."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Literal

from ml.features import rollup_vector
from ml.mock_sleep_bank import aggregate_mock_intervals
from ml.optimizer import OptimizerConfig, optimize
from ml.plan_inputs import (
    aggregate_interval_matrices,
    debrief_woke_rate,
    rollups_from_debriefs,
)
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


def _sleep_data_reason(
    repo: Repository,
    user_id: str,
    *,
    using_google: bool,
) -> Literal["not_connected", "connect_failed", "insufficient_data", "using_google"]:
    if using_google:
        return "using_google"
    conn = repo.db.get_connection(user_id)
    if conn is None:
        return "not_connected"
    if repo.db.google_feature_count_for_user(user_id) == 0:
        return "insufficient_data"
    return "insufficient_data"


def build_plan(
    repo: Repository,
    risk_model: RiskModel,
    config: AppConfig,
    request: PlanRequest,
) -> PlanResponse:
    grid_size = config.risk.grid_size
    real_sets = repo.db.list_recent_feature_sets(request.userId, k=7)

    if real_sets:
        payload = aggregate_interval_matrices(
            real_sets,
            grid_size=grid_size,
            user_id=request.userId,
            timezone=request.timezone,
            reference_now=request.referenceNow,
            bedtime_minutes=request.bedtimeMinutes,
            wake_minutes=request.wakeMinutes,
            source="google_health",
        )
        sleep_source: Literal["google_health", "mock"] = "google_health"
        sleep_reason = "using_google"
    else:
        payload = aggregate_mock_intervals(
            request.bedtimeMinutes,
            request.wakeMinutes,
            user_id=request.userId,
            timezone_name=request.timezone,
            reference_now=request.referenceNow,
        )
        sleep_source = "mock"
        sleep_reason = _sleep_data_reason(repo, request.userId, using_google=False)

    debriefs = repo.db.list_recent_debriefs(request.userId, k=7)
    rollups = rollups_from_debriefs(debriefs)
    woke_rate = debrief_woke_rate(debriefs)
    rv = rollup_vector(rollups, woke_rate_7d=woke_rate)

    google_nights = repo.db.google_feature_count_for_user(request.userId)
    debrief_count = len(debriefs)
    cold_start = debrief_count < 3 and google_nights < 2

    risk = risk_model.predict(
        payload,
        rv,
        grid_size=grid_size,
        nights_available=google_nights,
        cold_start_threshold=config.risk.cold_start_threshold,
    )
    if cold_start:
        risk = RiskCurve(t_centers=risk.t_centers, p=risk.p, cold_start=True)

    rationale = _rationale_for(risk)
    night_id, existing = _resolve_open_night(repo, request)
    profile_id = f"generated-{datetime.now(timezone.utc).date().isoformat()}-{night_id[-6:]}"

    opt_config: OptimizerConfig = config.optimizer
    last_groggy = int(rollups.lastDebriefGroggy or 0) if rollups is not None else 0
    if last_groggy >= 4:
        opt_config = OptimizerConfig(
            dose_max=opt_config.dose_max,
            dose_min=opt_config.dose_min,
            max_dose_per_interval=opt_config.max_dose_per_interval,
            min_delay_t=opt_config.min_delay_t,
            taper_start_t_max=max(0.55, opt_config.taper_start_t_max - 0.05),
            smoothness_lambda=opt_config.smoothness_lambda,
            total_dose_lambda=opt_config.total_dose_lambda,
            taper_to_zero_at_wake=opt_config.taper_to_zero_at_wake,
        )

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
    if last_groggy >= 4:
        constraints_hit.append("groggy_taper")

    metadata = PlanMetadata(
        modelVersion=config.model_version,
        coldStart=risk.cold_start,
        constraintsHit=constraints_hit,
        generatedAt=datetime.now(timezone.utc),
        nightId=night_id,
        sleepDataSource=sleep_source,
        sleepDataReason=sleep_reason,
    )

    risk_points = risk.as_points()

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
