"""Shared pytest fixtures."""
from __future__ import annotations

import os

from cryptography.fernet import Fernet

# Do not load developer backend/.env in tests.
os.environ["SLEEPSYNC_SKIP_APP_BOOT"] = "1"
os.environ["SLEEPSYNC_SKIP_DOTENV"] = "1"
os.environ["SLEEPSYNC_ENV"] = "development"
os.environ.setdefault("TOKEN_ENCRYPTION_KEY", Fernet.generate_key().decode())
os.environ.pop("GOOGLE_OAUTH_CLIENT_ID", None)
os.environ.pop("GOOGLE_OAUTH_CLIENT_SECRET", None)

import pytest
from fastapi.testclient import TestClient

from app.config import get_config
from app.deps import get_risk_model
from app.main import create_app
from ml.risk_model import RiskModel
from storage.db import get_db


@pytest.fixture
def client(monkeypatch, tmp_path):
    db_path = tmp_path / "test.db"
    monkeypatch.setenv("SLEEPSYNC_DB_PATH", str(db_path))
    monkeypatch.setenv("SLEEPSYNC_ENV", "development")
    get_config.cache_clear()
    get_db.cache_clear()
    from storage.db import get_engine

    get_engine.cache_clear()
    get_risk_model.cache_clear()

    app = create_app()
    with TestClient(app) as c:
        yield c
    get_db.cache_clear()
    from storage.db import get_engine

    get_engine.cache_clear()
    get_risk_model.cache_clear()
    get_config.cache_clear()


@pytest.fixture
def risk_model() -> RiskModel:
    return RiskModel()
