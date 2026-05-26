"""Shared FastAPI dependencies. Singletons so the risk model warms once."""
from __future__ import annotations

from functools import lru_cache

from ml.risk_model import RiskModel


@lru_cache(maxsize=1)
def get_risk_model() -> RiskModel:
    return RiskModel()
