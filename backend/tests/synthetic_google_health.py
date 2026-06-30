"""Deterministic synthetic Google Health feature payloads for tests."""
from __future__ import annotations

import hashlib
from datetime import datetime

from ml.time_window import INTERVAL_MINUTES, gauss, interval_count_for_window, sleep_window_duration_minutes
from models.schemas import (
    FeatureRollups,
    FeaturesPayload,
    IntervalFeature,
    StageFractions,
)


def synthetic_features(
    user_id: str,
    bedtime_minutes: int,
    wake_minutes: int,
    timezone_name: str,
    reference_now: datetime,
    grid_size: int | None = None,
) -> FeaturesPayload:
    """Deterministic synthetic google_health features, seeded per user."""
    if grid_size is None:
        grid_size = interval_count_for_window(bedtime_minutes, wake_minutes)
    seed = int(hashlib.sha256(user_id.encode("utf-8")).hexdigest(), 16)
    spike = 0.55 + 0.23 * ((seed % 1000) / 999.0)
    bin_minutes = sleep_window_duration_minutes(bedtime_minutes, wake_minutes) / grid_size

    intervals: list[IntervalFeature] = []
    for i in range(grid_size):
        t_start = i / grid_size
        t_end = (i + 1) / grid_size
        mid = 0.5 * (t_start + t_end)
        awake = min(0.85, 0.06 + 0.52 * gauss(mid, spike, 0.08))
        deep = 0.25 * gauss(mid, 0.20, 0.18)
        rem = 0.30 * gauss(mid, 0.80, 0.18)
        light = max(0.0, 1.0 - awake - deep - rem)
        intervals.append(
            IntervalFeature(
                index=i,
                tStart=round(t_start, 6),
                tEnd=round(t_end, 6),
                stageFractions=StageFractions(awake=awake, light=light, deep=deep, rem=rem),
                minutesAwake=round(awake * bin_minutes, 3),
                hrvMs=round(45.0 - 8.0 * gauss(mid, spike, 0.10), 3),
                restingHr=round(58.0 + 3.0 * gauss(mid, spike, 0.10), 3),
                respiratoryRate=14.2,
            )
        )

    rollups = FeatureRollups(
        sleepEfficiency7d=round(0.78 + 0.10 * ((seed >> 10) % 100) / 100.0, 3),
        bedtimeConsistencyMinutes=22.0,
        wakeConsistencyMinutes=17.0,
        sleepDebtMinutes=75.0,
    )

    return FeaturesPayload(
        userId=user_id,
        timezone=timezone_name,
        referenceNow=reference_now,
        bedtimeMinutes=bedtime_minutes,
        wakeMinutes=wake_minutes,
        source="google_health",
        intervalMinutes=INTERVAL_MINUTES,
        intervals=intervals,
        rollups=rollups,
    )
