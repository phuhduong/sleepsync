"""Constrained release-profile optimizer.

Inputs: risk curve `p(t)` (per interval) + constraint config.
Output: mobile-compatible `Profile` (keyframes + phases) where dose ∈ [0, 1] is
**normalized release intensity** — not clinical mg.

Approach
--------
The profile is parametrized by 6 phase parameters (4 phase boundaries + 2 dose
levels) so the SLSQP output maps directly onto a mobile-shaped `Profile`:

  x = [t_delay, t_ramp, t_sus_end, t_prewake, dose_peak, dose_prewake]

Keyframes:

  (0, 0) → (t_delay, 0) → (t_ramp, dose_peak) → (t_sus_end, dose_peak)
        → (t_prewake, dose_prewake) → (1, 0)

Objective (minimize)
  -coverage + λ_smooth * roughness + λ_total * total_dose
where coverage = Σ p_i * dose(t_i), roughness = Σ (Δdose)^2.

Constraints
  • Phase ordering with minimum gaps        (linear)
  • min_delay_t, taper_start_t_max (= upper bound on t_sus_end)
  • dose ∈ [dose_min, dose_max]               (box on x)
  • dose_prewake ≤ dose_peak                  (linear)
  • Maximum slope per interval on each segment (ramp, taper-from-peak,
    final descent to 0) ≤ max_dose_per_interval / Δt
  • Taper to 0 at t = 1 — built in by construction (last keyframe is (1, 0))

The optimizer is intentionally agnostic of the model that produced the risk
curve (separation of classifier and optimizer).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import numpy as np
from scipy.optimize import minimize

from models.schemas import Keyframe, Phase, Profile


@dataclass
class OptimizerConfig:
    dose_max: float = 1.0
    dose_min: float = 0.0
    max_dose_per_interval: float = 0.15
    min_delay_t: float = 0.10
    taper_start_t_max: float = 0.85
    smoothness_lambda: float = 0.20
    total_dose_lambda: float = 0.05
    taper_to_zero_at_wake: bool = True


@dataclass
class OptimizerResult:
    profile: Profile
    constraints_hit: list[str]
    raw_dose_curve: np.ndarray  # dense grid for tests/debug
    raw_t: np.ndarray


# ---------- public API ----------


def optimize(
    risk_p: np.ndarray,
    t_centers: np.ndarray,
    config: OptimizerConfig,
    *,
    rationale: str = "Generated overnight release profile",
    profile_id: Optional[str] = None,
) -> OptimizerResult:
    """Run SLSQP and return a Profile + diagnostics."""
    n_interval = len(t_centers)
    dt = 1.0 / n_interval
    rate_per_unit_t = config.max_dose_per_interval / dt  # cap on |dy/dt|

    # Initial guess — population-typical shape.
    x0 = np.array([0.15, 0.35, 0.68, 0.93, 0.85, 0.08])

    # Box bounds per variable.
    bounds = [
        (config.min_delay_t, 0.30),                # t_delay
        (0.22, 0.55),                              # t_ramp
        (0.55, config.taper_start_t_max),          # t_sus_end (= taper start)
        (0.88, 0.95),                              # t_prewake
        (0.30, config.dose_max),                   # dose_peak
        (config.dose_min, 0.20),                   # dose_prewake
    ]

    eps_gap = 0.04
    min_plateau = 0.15
    constraints = [
        # Ordering with minimum gaps
        {"type": "ineq", "fun": lambda x: x[1] - x[0] - eps_gap},
        {"type": "ineq", "fun": lambda x: x[2] - x[1] - min_plateau},
        {"type": "ineq", "fun": lambda x: x[3] - x[2] - eps_gap},
        # Dose stack: prewake ≤ peak
        {"type": "ineq", "fun": lambda x: x[4] - x[5]},
        # Rate caps: |Δdose|/Δt ≤ rate_per_unit_t on each segment.
        # Ramp:    (dose_peak)/(t_ramp - t_delay)
        {
            "type": "ineq",
            "fun": lambda x: rate_per_unit_t * (x[1] - x[0]) - x[4],
        },
        # Taper from peak: (dose_peak - dose_prewake)/(t_prewake - t_sus_end)
        {
            "type": "ineq",
            "fun": lambda x: rate_per_unit_t * (x[3] - x[2]) - (x[4] - x[5]),
        },
        # Final descent to 0: dose_prewake/(1 - t_prewake)
        {
            "type": "ineq",
            "fun": lambda x: rate_per_unit_t * (1.0 - x[3]) - x[5],
        },
    ]

    def objective(x: np.ndarray) -> float:
        dose = _dose_curve_from_params(x, t_centers)
        coverage = float(np.sum(risk_p * dose) * dt)
        rough = float(np.sum(np.diff(dose) ** 2))
        total = float(np.sum(dose) * dt)
        return -coverage + config.smoothness_lambda * rough + config.total_dose_lambda * total

    res = minimize(
        objective,
        x0,
        method="SLSQP",
        bounds=bounds,
        constraints=constraints,
        options={"maxiter": 200, "ftol": 1e-6, "disp": False},
    )

    x = res.x if res.success else x0
    x = _project_feasible(x, config, rate_per_unit_t)

    profile = _build_profile(x, profile_id=profile_id, rationale=rationale)
    constraints_hit = _detect_active_constraints(x, config, rate_per_unit_t)
    dose_dense = _dose_curve_from_params(x, t_centers)

    return OptimizerResult(
        profile=profile,
        constraints_hit=constraints_hit,
        raw_dose_curve=dose_dense,
        raw_t=t_centers,
    )


# ---------- internal helpers ----------


def _round_dose(value: float) -> float:
    """JSON-friendly release intensity (avoids 0.9999999999999997 artifacts)."""
    return round(float(np.clip(value, 0.0, 1.0)), 3)


def _dose_curve_from_params(x: np.ndarray, t: np.ndarray) -> np.ndarray:
    """Piecewise-linear dose curve at sample points `t` given phase params `x`."""
    t_delay, t_ramp, t_sus_end, t_prewake, d_peak, d_prewake = x
    kx = np.array([0.0, t_delay, t_ramp, t_sus_end, t_prewake, 1.0])
    ky = np.array([0.0, 0.0, d_peak, d_peak, d_prewake, 0.0])
    return np.interp(t, kx, ky)


def _project_feasible(
    x: np.ndarray, config: OptimizerConfig, rate_per_unit_t: float
) -> np.ndarray:
    """Clamp x to ordering + bounds in case the solver returned slightly off."""
    x = x.copy()
    x[0] = max(x[0], config.min_delay_t)
    x[1] = max(x[1], x[0] + 0.04)
    x[2] = min(max(x[2], x[1] + 0.15), config.taper_start_t_max)
    x[3] = min(max(x[3], x[2] + 0.04), 0.95)
    x[4] = float(np.clip(x[4], 0.30, config.dose_max))
    x[5] = float(np.clip(x[5], config.dose_min, min(0.20, x[4])))

    # Enforce rate caps by projecting onto the closest feasible point.
    # Ramp slope cap.
    max_peak_for_ramp = rate_per_unit_t * (x[1] - x[0])
    x[4] = min(x[4], max_peak_for_ramp)
    # Taper-from-peak slope cap.
    max_drop_taper = rate_per_unit_t * (x[3] - x[2])
    x[5] = max(x[5], x[4] - max_drop_taper)
    # Final descent cap (descent from x[5] to 0 over (1 - t_prewake)).
    max_prewake_for_descent = rate_per_unit_t * (1.0 - x[3])
    x[5] = min(x[5], max_prewake_for_descent)
    # Re-clip after projection.
    x[5] = float(np.clip(x[5], config.dose_min, min(0.20, x[4])))
    return x


def _build_profile(
    x: np.ndarray, *, profile_id: Optional[str], rationale: str
) -> Profile:
    t_delay, t_ramp, t_sus_end, t_prewake, d_peak, d_prewake = (float(v) for v in x)
    d_peak = _round_dose(d_peak)
    d_prewake = _round_dose(d_prewake)
    d_taper_label = _round_dose((d_peak + d_prewake) / 2.0)

    keyframes = [
        Keyframe(t=0.0, dose=0.0),
        Keyframe(t=t_delay, dose=0.0, label="Delayed"),
        Keyframe(t=t_ramp, dose=d_peak, label="Ramp"),
        Keyframe(t=t_sus_end, dose=d_peak, label="Sustained"),
        Keyframe(t=t_prewake, dose=d_prewake, label="Pre-wake"),
        Keyframe(t=1.0, dose=0.0),
    ]
    phases = [
        Phase(id="delayed", name="Delayed Start", duration=t_delay, dose=0.0),
        Phase(id="ramp", name="Ramp Up", duration=t_ramp - t_delay, dose=d_peak),
        Phase(id="sustained", name="Sustained", duration=t_sus_end - t_ramp, dose=d_peak),
        Phase(id="taper", name="Taper", duration=t_prewake - t_sus_end, dose=d_taper_label),
        Phase(id="prewake", name="Pre-wake", duration=1.0 - t_prewake, dose=d_prewake),
    ]
    return Profile(
        id=profile_id or "generated",
        name="Tonight's plan",
        recommended=True,
        rationale=rationale,
        keyframes=keyframes,
        phases=phases,
    )


def _detect_active_constraints(
    x: np.ndarray, config: OptimizerConfig, rate_per_unit_t: float
) -> list[str]:
    hit: list[str] = []
    tol = 1e-3
    if x[0] <= config.min_delay_t + tol:
        hit.append("min_delay_t")
    if x[2] >= config.taper_start_t_max - tol:
        hit.append("taper_start_t_max")
    if x[4] >= config.dose_max - tol:
        hit.append("dose_max")

    ramp_rate = x[4] / max(x[1] - x[0], 1e-6)
    taper_rate = (x[4] - x[5]) / max(x[3] - x[2], 1e-6)
    final_rate = x[5] / max(1.0 - x[3], 1e-6)
    if max(ramp_rate, taper_rate, final_rate) >= rate_per_unit_t - tol:
        hit.append("max_rate")

    if config.taper_to_zero_at_wake:
        hit.append("taper_wake")
    return hit
