"""Window-normalized feature matrix for the wake-risk classifier.

Intervals use t ∈ [0, 1] over the scheduled bed→wake window (same as mobile
``profileTimelineT``). The backend resamples uploaded intervals onto a uniform grid.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import numpy as np

from models.schemas import FeaturesPayload, FeatureRollups, IntervalFeature


# Reasonable physiological centers used to z-ish-normalize vitals when present.
HRV_REF_MEAN = 45.0
HRV_REF_STD = 18.0
HR_REF_MEAN = 60.0
HR_REF_STD = 8.0
RESP_REF_MEAN = 14.0
RESP_REF_STD = 2.0


@dataclass
class RollupVector:
    sleep_efficiency: float  # 0..1, lower → higher risk
    bedtime_consistency: float  # minutes (lower better)
    wake_consistency: float  # minutes (lower better)
    sleep_debt_minutes: float  # positive = debt
    last_woke: float  # +1 yes, 0 unsure/missing, -1 no
    last_groggy: float  # 1..5, 0 if missing


def rollup_vector(rollups: Optional[FeatureRollups]) -> RollupVector:
    if rollups is None:
        return RollupVector(
            sleep_efficiency=0.85,
            bedtime_consistency=30.0,
            wake_consistency=30.0,
            sleep_debt_minutes=0.0,
            last_woke=0.0,
            last_groggy=0.0,
        )
    woke_map = {"yes": 1.0, "no": -1.0, "unsure": 0.0}
    return RollupVector(
        sleep_efficiency=_default(rollups.sleepEfficiency7d, 0.85),
        bedtime_consistency=_default(rollups.bedtimeConsistencyMinutes, 30.0),
        wake_consistency=_default(rollups.wakeConsistencyMinutes, 30.0),
        sleep_debt_minutes=_default(rollups.sleepDebtMinutes, 0.0),
        last_woke=woke_map.get(rollups.lastDebriefWoke or "unsure", 0.0),
        last_groggy=float(rollups.lastDebriefGroggy or 0),
    )


def _default(v: Optional[float], fallback: float) -> float:
    return float(v) if v is not None else fallback


def interval_feature_matrix(
    payload: FeaturesPayload, grid_size: int
) -> tuple[np.ndarray, np.ndarray]:
    """Resample the upload's intervals onto a uniform grid of length `grid_size`.

    Returns
    -------
    X : (grid_size, n_features) float array
    t_centers : (grid_size,) float array of t midpoints in [0, 1]
    """
    t_centers = (np.arange(grid_size) + 0.5) / grid_size

    awake_frac = np.zeros(grid_size)
    minutes_awake = np.zeros(grid_size)
    hrv = np.full(grid_size, np.nan)
    hr = np.full(grid_size, np.nan)
    resp = np.full(grid_size, np.nan)

    for iv in payload.intervals:
        # Snap interval to grid by midpoint.
        mid = 0.5 * (iv.tStart + iv.tEnd)
        idx = min(int(mid * grid_size), grid_size - 1)
        if iv.stageFractions is not None and iv.stageFractions.awake is not None:
            awake_frac[idx] = max(awake_frac[idx], float(iv.stageFractions.awake))
        if iv.minutesAwake is not None:
            minutes_awake[idx] = max(minutes_awake[idx], float(iv.minutesAwake))
        if iv.hrvMs is not None:
            hrv[idx] = float(iv.hrvMs)
        if iv.restingHr is not None:
            hr[idx] = float(iv.restingHr)
        if iv.respiratoryRate is not None:
            resp[idx] = float(iv.respiratoryRate)

    # Fill NaN vitals with reference means (mild prior).
    hrv = np.where(np.isnan(hrv), HRV_REF_MEAN, hrv)
    hr = np.where(np.isnan(hr), HR_REF_MEAN, hr)
    resp = np.where(np.isnan(resp), RESP_REF_MEAN, resp)

    # Window-normalized circadian features.
    sin_t = np.sin(2 * np.pi * t_centers)
    cos_t = np.cos(2 * np.pi * t_centers)

    # Per-interval feature columns.
    cols = [
        t_centers,
        t_centers ** 2,
        sin_t,
        cos_t,
        awake_frac,
        minutes_awake / 15.0,  # scaled to interval-fraction-ish
        (hrv - HRV_REF_MEAN) / HRV_REF_STD,
        (hr - HR_REF_MEAN) / HR_REF_STD,
        (resp - RESP_REF_MEAN) / RESP_REF_STD,
    ]
    X = np.stack(cols, axis=1)
    return X, t_centers


def feature_names() -> list[str]:
    return [
        "t",
        "t_sq",
        "sin_t",
        "cos_t",
        "awake_frac",
        "minutes_awake_scaled",
        "hrv_z",
        "hr_z",
        "resp_z",
    ]
