"""Wake-risk classifier — per-interval risk over the upcoming sleep window.

Hand-tuned logistic weights produce a cold-start curve; optional ``fit()`` retrains
from labeled intervals. Outputs only a risk curve — the optimizer builds the profile.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import numpy as np

from models.schemas import FeaturesPayload, RiskPoint

from .features import RollupVector, feature_names, interval_feature_matrix, rollup_vector


# Hand-tuned weights producing a calibrated cold-start logistic curve. Order
# matches `features.feature_names()`.
DEFAULT_WEIGHTS = np.array(
    [
        2.20,   # t            — risk rises through the night
        -1.40,  # t_sq         — but peaks before wake (concave bend)
        0.00,   # sin_t        — circadian (neutral by default)
        -0.30,  # cos_t        — slight phase preference for late-night peak
        2.40,   # awake_frac   — current awake → higher risk
        1.10,   # minutes_awake_scaled
        -0.40,  # hrv_z        — high HRV → calmer → lower risk
        0.35,   # hr_z         — high HR → higher risk
        0.20,   # resp_z       — irregular breathing → modest risk
    ]
)
DEFAULT_BIAS = -1.60  # tuned so baseline ≈ 0.10 and peak ≈ 0.55


@dataclass
class RiskCurve:
    """Output of the risk model — per-interval probabilities."""

    t_centers: np.ndarray  # (N,)
    p: np.ndarray  # (N,) in [0, 1]
    cold_start: bool

    def as_points(self) -> list[RiskPoint]:
        n = len(self.t_centers)
        width = 1.0 / n
        return [
            RiskPoint(
                t=float(self.t_centers[i] - width / 2),
                p=float(self.p[i]),
                tEnd=float(self.t_centers[i] + width / 2),
            )
            for i in range(n)
        ]

    def peak_t(self) -> float:
        return float(self.t_centers[int(np.argmax(self.p))])


class RiskModel:
    """Logistic per-interval classifier with hand-tuned default weights."""

    version = "risk-0.1.0"

    def __init__(
        self,
        weights: Optional[np.ndarray] = None,
        bias: float = DEFAULT_BIAS,
    ) -> None:
        self.weights = DEFAULT_WEIGHTS.copy() if weights is None else np.asarray(weights)
        self.bias = float(bias)
        assert self.weights.shape == (len(feature_names()),), (
            f"weight dim mismatch: {self.weights.shape}"
        )

    def fit(self, X: np.ndarray, y: np.ndarray) -> None:
        """Refit on per-interval 0/1 labels (optional; not used in nightly serving)."""
        from sklearn.linear_model import LogisticRegression  # noqa: PLC0415

        model = LogisticRegression(C=1.0, max_iter=200)
        model.fit(X, y)
        self.weights = model.coef_[0].astype(float)
        self.bias = float(model.intercept_[0])

    def predict(
        self,
        payload: Optional[FeaturesPayload],
        rollups: RollupVector,
        grid_size: int,
        nights_available: int,
        cold_start_threshold: int,
    ) -> RiskCurve:
        cold_start = nights_available < cold_start_threshold or payload is None

        if payload is None:
            t_centers = (np.arange(grid_size) + 0.5) / grid_size
            X = self._prior_features(t_centers)
        else:
            X, t_centers = interval_feature_matrix(payload, grid_size)

        logits = X @ self.weights + self.bias
        logits += _rollup_offset(rollups, t_centers)
        p = _sigmoid(logits)
        p = np.clip(p, 0.02, 0.95)
        return RiskCurve(t_centers=t_centers, p=p, cold_start=cold_start)

    @staticmethod
    def _prior_features(t_centers: np.ndarray) -> np.ndarray:
        """Cold-start feature matrix with neutral vitals."""
        n = len(t_centers)
        zeros = np.zeros(n)
        cols = [
            t_centers,
            t_centers ** 2,
            np.sin(2 * np.pi * t_centers),
            np.cos(2 * np.pi * t_centers),
            zeros,
            zeros,
            zeros,
            zeros,
            zeros,
        ]
        return np.stack(cols, axis=1)


def _sigmoid(x: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-x))


def _rollup_offset(rollups: RollupVector, t_centers: np.ndarray) -> np.ndarray:
    n = len(t_centers)
    out = np.zeros(n)

    eff_penalty = max(0.0, 0.85 - rollups.sleep_efficiency)
    out += 1.6 * eff_penalty * _bump(t_centers, center=0.60, width=0.22)

    if rollups.last_woke > 0:
        out += 0.8 * _bump(t_centers, center=0.62, width=0.16)
    elif rollups.last_woke < 0:
        out -= 0.4 * _bump(t_centers, center=0.62, width=0.18)

    if rollups.woke_rate_7d > 0.5:
        out += 0.35 * _bump(t_centers, center=0.60, width=0.20)

    out -= 0.15 * np.clip(rollups.sleep_debt_minutes / 240.0, 0.0, 1.0)

    return out


def _bump(t: np.ndarray, center: float, width: float) -> np.ndarray:
    return np.exp(-0.5 * ((t - center) / width) ** 2)
