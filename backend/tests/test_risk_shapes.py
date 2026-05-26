"""Risk model output shape and cold-start behavior."""
from __future__ import annotations

import numpy as np

from ml.features import rollup_vector
from ml.risk_model import RiskModel
from models.schemas import FeatureRollups


def test_cold_start_no_payload():
    rm = RiskModel()
    rv = rollup_vector(None)
    risk = rm.predict(None, rv, grid_size=32, nights_available=0, cold_start_threshold=3)
    assert risk.cold_start is True
    assert risk.p.shape == (32,)
    assert np.all(risk.p >= 0.02)
    assert np.all(risk.p <= 0.95)


def test_warm_path_with_rollup_modulation():
    rm = RiskModel()
    woke_yes = rollup_vector(
        FeatureRollups(
            sleepEfficiency7d=0.70,
            lastDebriefWoke="yes",
            lastDebriefGroggy=4,
        )
    )
    woke_no = rollup_vector(
        FeatureRollups(
            sleepEfficiency7d=0.90,
            lastDebriefWoke="no",
            lastDebriefGroggy=1,
        )
    )
    yes_curve = rm.predict(None, woke_yes, grid_size=32, nights_available=10, cold_start_threshold=3)
    no_curve = rm.predict(None, woke_no, grid_size=32, nights_available=10, cold_start_threshold=3)

    # The "woke yes + low efficiency" curve should be higher around the wake-maintenance band.
    band = (yes_curve.t_centers > 0.55) & (yes_curve.t_centers < 0.75)
    assert yes_curve.p[band].mean() > no_curve.p[band].mean()


def test_fit_roundtrip_changes_weights():
    rm = RiskModel()
    initial = rm.weights.copy()
    n_samples = 200
    rng = np.random.default_rng(0)
    X = rng.normal(size=(n_samples, len(initial)))
    # Synthetic labels: positive when first feature (≈t) is large.
    y = (X[:, 0] > 0.5).astype(int)
    rm.fit(X, y)
    assert not np.allclose(rm.weights, initial)
