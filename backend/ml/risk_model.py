"""Wake-risk logistic classifier; outputs risk curve only (optimizer builds profile)."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import numpy as np

from models.schemas import FeaturesPayload, RiskPoint

from .features import RollupVector, feature_names, interval_feature_matrix


# Hand-tuned cold-start weights; order matches feature_names().
DEFAULT_WEIGHTS = np.array(
    [2.20, -1.40, 0.00, -0.30, 2.40, 1.10, -0.40, 0.35, 0.20]
)
DEFAULT_BIAS = -1.60
ARTIFACT_VERSION = "risk-v1.0.0"


@dataclass(frozen=True)
class PopulationPrior:
    peak_t: float
    peak_width: float
    baseline: float
    peak_height: float


@dataclass
class RiskCurve:
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
    version = "heuristic-v0"

    def __init__(
        self,
        weights: Optional[np.ndarray] = None,
        bias: float | None = None,
    ) -> None:
        artifact = _load_artifact_weights()
        if weights is None and artifact is not None:
            weights, bias = artifact
            self.version = ARTIFACT_VERSION
        if weights is None:
            weights = DEFAULT_WEIGHTS.copy()
        if bias is None:
            bias = DEFAULT_BIAS
        self.weights = np.asarray(weights)
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
        population_prior: PopulationPrior | None = None,
    ) -> RiskCurve:
        cold_start = nights_available < cold_start_threshold or payload is None

        if payload is None:
            t_centers = (np.arange(grid_size) + 0.5) / grid_size
            X = self._prior_features(t_centers)
        else:
            X, t_centers = interval_feature_matrix(payload, grid_size)

        logits = X @ self.weights + self.bias
        logits += _rollup_offset(rollups, t_centers)
        if payload is None and population_prior is not None:
            logits += _prior_logit_offset(t_centers, population_prior)
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


def _prior_logit_offset(t_centers: np.ndarray, prior: PopulationPrior) -> np.ndarray:
    bump = _bump(t_centers, center=prior.peak_t, width=prior.peak_width)
    target = np.clip(prior.baseline + prior.peak_height * bump, 0.05, 0.90)
    neutral = 0.5
    return np.log(target / (1.0 - target)) - np.log(neutral / (1.0 - neutral))


def _load_artifact_weights() -> tuple[np.ndarray, float] | None:
    """Load trained weights from RISK_MODEL_ARTIFACT (.npz from train_risk_model)."""
    raw = os.environ.get("RISK_MODEL_ARTIFACT", "").strip()
    if not raw:
        default = Path(__file__).resolve().parent / "risk_model_weights.npz"
        path = default if default.is_file() else None
    else:
        path = Path(raw)
    if path is None or not path.is_file():
        return None
    data = np.load(path)
    weights = np.asarray(data["weights"], dtype=float)
    bias = float(data["bias"])
    if weights.shape != (len(feature_names()),):
        raise ValueError(f"artifact feature dim mismatch: {weights.shape}")
    return weights, bias
