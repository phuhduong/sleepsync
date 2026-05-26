"""Dev-only endpoints — mock features and per-user data purge."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Response

from models.schemas import (
    FeatureRollups,
    FeaturesPayload,
    FeaturesResponse,
    IntervalFeature,
    MockFeaturesRequest,
    StageFractions,
)
from storage.repositories import Repository, get_repository

router = APIRouter(prefix="/v1/dev", tags=["dev"])


@router.post("/purge", status_code=204)
def purge_user_data(
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
    repo: Repository = Depends(get_repository),
) -> Response:
    """Delete nights, feature sets, and Google Health connection for the demo user."""
    if not x_user_id:
        raise HTTPException(status_code=400, detail="X-User-Id header required")
    repo.db.purge_user_data(x_user_id)
    return Response(status_code=204)


@router.post("/mock-features", response_model=FeaturesResponse, status_code=200)
def mock_features(
    req: MockFeaturesRequest | None = None,
    repo: Repository = Depends(get_repository),
) -> FeaturesResponse:
    req = req or MockFeaturesRequest()
    payload = build_mock_payload(req)
    feature_set_id = f"fs-mock-{uuid.uuid4()}"
    repo.db.put_feature_set(feature_set_id, payload)
    return FeaturesResponse(
        featureSetId=feature_set_id,
        nightsAvailable=repo.db.feature_count_for_user(payload.userId),
    )


# Exposed for fixtures + tests.
def build_mock_payload(req: MockFeaturesRequest) -> FeaturesPayload:
    user_id = req.userId or "demo-user"
    bedtime = req.bedtimeMinutes if req.bedtimeMinutes is not None else 23 * 60  # 23:00
    wake = req.wakeMinutes if req.wakeMinutes is not None else 7 * 60  # 07:00 next day

    # Scenario picks where the "awake spike" sits on t ∈ [0, 1].
    spike_center = {"early": 0.30, "middle": 0.55, "late": 0.78}.get(req.scenario or "middle", 0.65)

    intervals: list[IntervalFeature] = []
    n = 32
    for i in range(n):
        t_start = i / n
        t_end = (i + 1) / n
        mid = 0.5 * (t_start + t_end)
        # Awake fraction peaks near `spike_center`.
        awake = 0.06 + 0.50 * _gauss(mid, center=spike_center, width=0.08)
        awake = min(awake, 0.85)
        deep = 0.25 * _gauss(mid, center=0.20, width=0.18)
        rem = 0.30 * _gauss(mid, center=0.80, width=0.18)
        light = max(0.0, 1.0 - awake - deep - rem)
        intervals.append(
            IntervalFeature(
                index=i,
                tStart=t_start,
                tEnd=t_end,
                stageFractions=StageFractions(awake=awake, light=light, deep=deep, rem=rem),
                minutesAwake=awake * 15.0,
                hrvMs=45.0 - 8.0 * _gauss(mid, center=spike_center, width=0.10),
                restingHr=58.0 + 3.0 * _gauss(mid, center=spike_center, width=0.10),
                respiratoryRate=14.2,
            )
        )

    rollups = FeatureRollups(
        sleepEfficiency7d=0.82,
        bedtimeConsistencyMinutes=25.0,
        wakeConsistencyMinutes=18.0,
        sleepDebtMinutes=90.0,
        lastDebriefWoke="yes",
        lastDebriefGroggy=3,
    )

    return FeaturesPayload(
        userId=user_id,
        timezone="America/New_York",
        referenceNow=datetime.now(timezone.utc),
        bedtimeMinutes=bedtime,
        wakeMinutes=wake,
        source="mock",
        intervalMinutes=15,
        intervals=intervals,
        rollups=rollups,
    )


def _gauss(t: float, center: float, width: float) -> float:
    import math

    return math.exp(-0.5 * ((t - center) / width) ** 2)
