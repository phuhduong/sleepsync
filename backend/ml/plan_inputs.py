from __future__ import annotations

from datetime import datetime
from typing import Literal

import numpy as np

from ml.features import (
    HRV_REF_MEAN,
    HRV_REF_STD,
    HR_REF_MEAN,
    HR_REF_STD,
    RESP_REF_MEAN,
    RESP_REF_STD,
    interval_feature_matrix,
)
from ml.time_window import INTERVAL_MINUTES
from models.schemas import DebriefRequest, FeatureRollups, FeaturesPayload, IntervalFeature, StageFractions

def aggregate_interval_matrices(
    payloads: list[FeaturesPayload],
    *,
    grid_size: int,
    user_id: str,
    timezone: str,
    reference_now: datetime,
    bedtime_minutes: int,
    wake_minutes: int,
    source: Literal["google_health", "mock"],
) -> FeaturesPayload:
    if not payloads:
        raise ValueError("aggregate_interval_matrices requires at least one payload")
    matrices = [interval_feature_matrix(p, grid_size)[0] for p in payloads]
    mean_x = np.mean(matrices, axis=0)
    intervals: list[IntervalFeature] = []
    for i in range(grid_size):
        t_start = i / grid_size
        t_end = (i + 1) / grid_size
        awake = float(np.clip(mean_x[i, 4], 0.0, 1.0))
        min_awake = float(mean_x[i, 5]) * 15.0
        hrv = float(mean_x[i, 6] * HRV_REF_STD + HRV_REF_MEAN)
        hr = float(mean_x[i, 7] * HR_REF_STD + HR_REF_MEAN)
        resp = float(mean_x[i, 8] * RESP_REF_STD + RESP_REF_MEAN)
        deep = max(0.0, 1.0 - awake) * 0.35
        rem = max(0.0, 1.0 - awake) * 0.25
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
        timezone=timezone,
        referenceNow=reference_now,
        bedtimeMinutes=bedtime_minutes,
        wakeMinutes=wake_minutes,
        source=source,
        intervalMinutes=INTERVAL_MINUTES,
        intervals=intervals,
        rollups=None,
    )


def rollups_from_debriefs(debriefs: list[DebriefRequest]) -> FeatureRollups | None:
    if not debriefs:
        return None
    latest = debriefs[0]
    yes_count = sum(1 for d in debriefs if d.woke == "yes")
    no_count = sum(1 for d in debriefs if d.woke == "no")
    denom = yes_count + no_count
    efficiency = (no_count / denom) if denom > 0 else None
    return FeatureRollups(
        sleepEfficiency7d=round(efficiency, 3) if efficiency is not None else None,
        bedtimeConsistencyMinutes=30.0,
        wakeConsistencyMinutes=30.0,
        sleepDebtMinutes=60.0 if yes_count >= 3 else 30.0,
        lastDebriefWoke=latest.woke,
        lastDebriefGroggy=latest.groggy,
    )


def debrief_woke_rate(debriefs: list[DebriefRequest]) -> float:
    if not debriefs:
        return 0.0
    yes = sum(1 for d in debriefs if d.woke == "yes")
    return yes / len(debriefs)
