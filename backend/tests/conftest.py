"""Shared pytest fixtures."""
from __future__ import annotations

import os

# Keep pytest hermetic — do not load developer backend/.env (would flip Google Health live).
os.environ["SLEEPSYNC_SKIP_DOTENV"] = "1"
os.environ.pop("GOOGLE_OAUTH_CLIENT_ID", None)
os.environ.pop("GOOGLE_OAUTH_CLIENT_SECRET", None)

import pytest
from fastapi.testclient import TestClient

from app.deps import get_risk_model
from app.main import create_app
from ml.risk_model import RiskModel
from storage.repositories import get_repository


@pytest.fixture
def client(monkeypatch, tmp_path):
    # Isolated SQLite file per test — nights/features survive within the test only.
    db_path = tmp_path / "test.db"
    monkeypatch.setenv("SLEEPSYNC_DB_PATH", str(db_path))
    get_repository.cache_clear()
    get_risk_model.cache_clear()
    app = create_app()
    with TestClient(app) as c:
        yield c
    get_repository.cache_clear()
    get_risk_model.cache_clear()


@pytest.fixture
def risk_model() -> RiskModel:
    return RiskModel()
