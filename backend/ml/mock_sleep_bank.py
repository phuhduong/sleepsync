"""Shared canonical 7-night mock sleep week for plan personalization.

Fixtures live under ``backend/fixtures/mock_sleep_week/``. Nights are not
inserted into per-user ``feature_sets``; ``aggregate_mock_intervals`` reads
them at plan time.
"""
from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path

from models.schemas import FeaturesPayload, IntervalFeature, StageFractions

_FIXTURE_DIR = Path(__file__).resolve().parent.parent / "fixtures" / "mock_sleep_week"
INTERVAL_MINUTES = 15


def _sleep_window_duration_minutes(bedtime_minutes: int, wake_minutes: int) -> int:
    bed = bedtime_minutes % 1440
    wake = wake_minutes % 1440
    if wake > bed:
        return wake - bed
    return 24 * 60 - bed + wake


def _interval_count_for_window(bedtime_minutes: int, wake_minutes: int) -> int:
    return max(
        1,
        math.ceil(_sleep_window_duration_minutes(bedtime_minutes, wake_minutes) / INTERVAL_MINUTES),
    )

# Spike centers on t ∈ [0, 1] — varied week for plausible aggregate.
_NIGHT_SCENARIOS: list[tuple[str, float, float]] = [
    ("standard", 0.55, 0.50),       # maintenance band
    ("early_wake", 0.32, 0.58),     # early fragmentation
    ("late_wake", 0.76, 0.48),
    ("high_fragmentation", 0.58, 0.72),
    ("stable", 0.52, 0.35),
    ("early_maintenance", 0.42, 0.45),
    ("pre_wake", 0.68, 0.40),
]


def _gauss(t: float, center: float, width: float) -> float:
    return math.exp(-0.5 * ((t - center) / width) ** 2)


def _build_night_payload(
    night_index: int,
    *,
    bedtime_minutes: int = 23 * 60,
    wake_minutes: int = 7 * 60,
) -> FeaturesPayload:
    _label, spike, awake_amp = _NIGHT_SCENARIOS[night_index % len(_NIGHT_SCENARIOS)]
    grid = _interval_count_for_window(bedtime_minutes, wake_minutes)
    window_mins = float(_sleep_window_duration_minutes(bedtime_minutes, wake_minutes))
    bin_minutes = window_mins / grid

    intervals: list[IntervalFeature] = []
    for i in range(grid):
        t_start = i / grid
        t_end = (i + 1) / grid
        mid = 0.5 * (t_start + t_end)
        awake = min(0.85, 0.05 + awake_amp * _gauss(mid, spike, 0.09))
        deep = 0.28 * _gauss(mid, 0.22, 0.16)
        rem = 0.26 * _gauss(mid, 0.78, 0.16)
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
                minutesAwake=round(awake * bin_minutes, 3),
                hrvMs=round(46.0 - 10.0 * _gauss(mid, spike, 0.11), 3),
                restingHr=round(57.0 + 4.0 * _gauss(mid, spike, 0.11), 3),
                respiratoryRate=14.2,
            )
        )

    ref = datetime(2026, 5, 20 + night_index, 12, 0, tzinfo=timezone.utc)
    return FeaturesPayload(
        userId="mock-week",
        timezone="America/New_York",
        referenceNow=ref,
        bedtimeMinutes=bedtime_minutes,
        wakeMinutes=wake_minutes,
        source="mock",
        intervalMinutes=INTERVAL_MINUTES,
        intervals=intervals,
        rollups=None,
    )


def ensure_fixture_files() -> None:
    """Write ``night_0.json`` … ``night_6.json`` if missing (dev convenience)."""
    _FIXTURE_DIR.mkdir(parents=True, exist_ok=True)
    for i in range(7):
        path = _FIXTURE_DIR / f"night_{i}.json"
        if not path.exists():
            payload = _build_night_payload(i)
            path.write_text(
                json.dumps(payload.model_dump(mode="json"), indent=2),
                encoding="utf-8",
            )


def load_mock_week() -> list[FeaturesPayload]:
    ensure_fixture_files()
    nights: list[FeaturesPayload] = []
    for i in range(7):
        path = _FIXTURE_DIR / f"night_{i}.json"
        raw = path.read_text(encoding="utf-8")
        nights.append(FeaturesPayload.model_validate_json(raw))
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
    grid = _interval_count_for_window(bedtime_minutes, wake_minutes)
    week = load_mock_week()
    # Resample each fixture night to the target schedule (fixtures use 23:00–07:00).
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
    grid = _interval_count_for_window(bedtime_minutes, wake_minutes)
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

    src_grid = _interval_count_for_window(payload.bedtimeMinutes, payload.wakeMinutes)
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
        deep = 0.28 * _gauss(0.5 * (t_start + t_end), 0.22, 0.16)
        rem = 0.26 * _gauss(0.5 * (t_start + t_end), 0.78, 0.16)
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
