"""Shared canonical 7-night mock sleep week for plan personalization."""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from ml.time_window import INTERVAL_MINUTES, gauss, interval_count_for_window
from models.schemas import FeaturesPayload, IntervalFeature, StageFractions

_FIXTURE_DIR = Path(__file__).resolve().parent.parent / "fixtures" / "mock_sleep_week"


def load_mock_week() -> list[FeaturesPayload]:
    nights: list[FeaturesPayload] = []
    for i in range(7):
        path = _FIXTURE_DIR / f"night_{i}.json"
        nights.append(FeaturesPayload.model_validate_json(path.read_text(encoding="utf-8")))
    return nights


def aggregate_mock_intervals(  # noqa: PLR0913
    bedtime_minutes: int,
    wake_minutes: int,
    *,
    user_id: str = "mock-week",
    timezone_name: str = "UTC",
    reference_now: datetime | None = None,
) -> FeaturesPayload:
    """Mean the canonical week onto the requested sleep window grid."""
    from ml.plan_inputs import aggregate_interval_matrices

    ref = reference_now or datetime.now(timezone.utc)
    grid = interval_count_for_window(bedtime_minutes, wake_minutes)
    week = load_mock_week()
    resampled = [
        _reschedule_payload(n, bedtime_minutes, wake_minutes, user_id, timezone_name, ref)
        for n in week
    ]
    return aggregate_interval_matrices(
        resampled,
        grid_size=grid,
        user_id=user_id,
        timezone=timezone_name,
        reference_now=ref,
        bedtime_minutes=bedtime_minutes,
        wake_minutes=wake_minutes,
        source="mock",
    )


def _reschedule_payload(
    payload: FeaturesPayload,
    bedtime_minutes: int,
    wake_minutes: int,
    user_id: str,
    timezone_name: str,
    reference_now: datetime,
) -> FeaturesPayload:
    """Re-bin interval pattern onto a new bed/wake grid (same duration shape)."""
    grid = interval_count_for_window(bedtime_minutes, wake_minutes)
    if payload.bedtimeMinutes == bedtime_minutes and payload.wakeMinutes == wake_minutes:
        return payload.model_copy(
            update={
                "userId": user_id,
                "timezone": timezone_name,
                "referenceNow": reference_now,
            }
        )
    import numpy as np

    from ml.features import (
        interval_feature_matrix,
        HRV_REF_MEAN,
        HRV_REF_STD,
        HR_REF_MEAN,
        HR_REF_STD,
        RESP_REF_MEAN,
        RESP_REF_STD,
    )

    src_grid = interval_count_for_window(payload.bedtimeMinutes, payload.wakeMinutes)
    X_src, _ = interval_feature_matrix(payload, src_grid)
    t_dst = (np.arange(grid) + 0.5) / grid
    t_src = (np.arange(src_grid) + 0.5) / src_grid
    X_dst = np.zeros((grid, X_src.shape[1]))
    for col in range(X_src.shape[1]):
        X_dst[:, col] = np.interp(t_dst, t_src, X_src[:, col])

    intervals: list[IntervalFeature] = []
    for i in range(grid):
        t_start = i / grid
        t_end = (i + 1) / grid
        awake = float(np.clip(X_dst[i, 4], 0.0, 1.0))
        min_awake = float(X_dst[i, 5]) * 15.0
        hrv = float(X_dst[i, 6] * HRV_REF_STD + HRV_REF_MEAN)
        hr = float(X_dst[i, 7] * HR_REF_STD + HR_REF_MEAN)
        resp = float(X_dst[i, 8] * RESP_REF_STD + RESP_REF_MEAN)
        mid = 0.5 * (t_start + t_end)
        deep = 0.28 * gauss(mid, 0.22, 0.16)
        rem = 0.26 * gauss(mid, 0.78, 0.16)
        light = max(0.0, 1.0 - awake - deep - rem)
        intervals.append(
            IntervalFeature(
                index=i,
                tStart=round(t_start, 6),
                tEnd=round(t_end, 6),
                stageFractions=StageFractions(
                    awake=round(awake, 4),
                    light=round(light, 4),
                    deep=round(deep, 4),
                    rem=round(rem, 4),
                ),
                minutesAwake=round(min_awake, 3),
                hrvMs=round(hrv, 3),
                restingHr=round(hr, 3),
                respiratoryRate=round(resp, 3),
            )
        )
    return FeaturesPayload(
        userId=user_id,
        timezone=timezone_name,
        referenceNow=reference_now,
        bedtimeMinutes=bedtime_minutes,
        wakeMinutes=wake_minutes,
        source="mock",
        intervalMinutes=INTERVAL_MINUTES,
        intervals=intervals,
        rollups=None,
    )
