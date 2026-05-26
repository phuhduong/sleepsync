"""Optimizer must respect documented constraints regardless of risk shape."""
from __future__ import annotations

import numpy as np
import pytest

from ml.optimizer import OptimizerConfig, optimize


def _risk(peak: float, height: float = 0.7, width: float = 0.12, n: int = 32) -> tuple[np.ndarray, np.ndarray]:
    t = (np.arange(n) + 0.5) / n
    p = 0.10 + height * np.exp(-0.5 * ((t - peak) / width) ** 2)
    return p, t


@pytest.mark.parametrize("peak", [0.30, 0.50, 0.65, 0.80])
def test_dose_bounds_and_endpoints(peak: float):
    p, t = _risk(peak)
    cfg = OptimizerConfig()
    res = optimize(p, t, cfg)
    kfs = res.profile.keyframes

    # Dose ∈ [0, 1] on every keyframe.
    for kf in kfs:
        assert 0.0 <= kf.dose <= cfg.dose_max + 1e-9, kf

    # First and last keyframes are zero (start of window, end of window).
    assert kfs[0].t == 0.0 and kfs[0].dose == 0.0
    assert kfs[-1].t == 1.0 and kfs[-1].dose == 0.0


@pytest.mark.parametrize("peak", [0.30, 0.50, 0.65, 0.80])
def test_min_delay_and_taper_bounds(peak: float):
    p, t = _risk(peak)
    cfg = OptimizerConfig()
    res = optimize(p, t, cfg)
    kfs = res.profile.keyframes

    # The first non-zero rise must come no earlier than min_delay_t.
    # Keyframe order: [(0,0), (t_delay,0), (t_ramp, peak), ...]
    assert kfs[1].dose == 0.0
    assert kfs[1].t >= cfg.min_delay_t - 1e-6

    # Taper start (4th keyframe, end of sustained) ≤ taper_start_t_max.
    assert kfs[3].t <= cfg.taper_start_t_max + 1e-6


@pytest.mark.parametrize("peak", [0.30, 0.65, 0.80])
def test_max_rate_respected_on_dense_grid(peak: float):
    p, t = _risk(peak)
    cfg = OptimizerConfig()
    res = optimize(p, t, cfg)
    dose = res.raw_dose_curve

    # On the same grid the optimizer was scored against, |Δdose| ≤ max_per_interval
    # (modest tolerance for piecewise-linear interp aliasing).
    deltas = np.abs(np.diff(dose))
    assert deltas.max() <= cfg.max_dose_per_interval + 0.05


def test_phases_cover_window():
    p, t = _risk(0.65)
    res = optimize(p, t, OptimizerConfig())
    total = sum(ph.duration for ph in res.profile.phases)
    assert abs(total - 1.0) < 1e-6


def test_responds_to_risk_peak_location():
    """When risk peaks early, sustained band shifts earlier (and vice versa)."""
    early_p, t = _risk(0.30)
    late_p, _ = _risk(0.78)

    early = optimize(early_p, t, OptimizerConfig()).profile
    late = optimize(late_p, t, OptimizerConfig()).profile

    early_sus_center = 0.5 * (early.keyframes[2].t + early.keyframes[3].t)
    late_sus_center = 0.5 * (late.keyframes[2].t + late.keyframes[3].t)
    assert early_sus_center < late_sus_center


def test_constraint_hits_recorded():
    p, t = _risk(0.65)
    res = optimize(p, t, OptimizerConfig())
    # taper_wake is always enforced by construction.
    assert "taper_wake" in res.constraints_hit
