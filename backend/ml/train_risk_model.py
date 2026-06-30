"""Offline risk model refit scaffold (not used in nightly serving).

Usage:
    uv run python -m ml.train_risk_model --labels path/to/labels.npz

Promote a trained artifact by updating DEFAULT_WEIGHTS in risk_model.py and
bumping versions.risk_model in config.yaml after validation.
"""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np

from ml.features import feature_names
from ml.risk_model import RiskModel


def train_from_labels(labels_path: Path) -> RiskModel:
    data = np.load(labels_path)
    X = data["X"]
    y = data["y"]
    if X.ndim != 2 or y.ndim != 1:
        raise ValueError("labels.npz must contain X (N, F) and y (N,)")
    if X.shape[1] != len(feature_names()):
        raise ValueError(f"expected {len(feature_names())} features, got {X.shape[1]}")
    model = RiskModel()
    model.fit(X, y)
    return model


def main() -> None:
    parser = argparse.ArgumentParser(description="Refit SleepSync risk heuristic")
    parser.add_argument("--labels", type=Path, required=True, help="npz with X, y arrays")
    parser.add_argument("--out", type=Path, default=Path("risk_model_weights.npz"))
    args = parser.parse_args()
    model = train_from_labels(args.labels)
    np.savez(
        args.out,
        weights=model.weights,
        bias=model.bias,
        feature_names=np.array(feature_names()),
    )
    print(f"wrote {args.out}")


if __name__ == "__main__":
    main()
