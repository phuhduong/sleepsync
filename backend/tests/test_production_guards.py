"""Production hardening guards."""
from __future__ import annotations

import pytest
from cryptography.fernet import Fernet


def test_dev_routes_disabled_in_production(monkeypatch, tmp_path):
    monkeypatch.setenv("SLEEPSYNC_DB_PATH", str(tmp_path / "prod.db"))
    monkeypatch.setenv("SLEEPSYNC_ENV", "production")
    from app.config import get_config
    from app.deps import get_risk_model
    from app.main import create_app
    from fastapi.testclient import TestClient
    from storage.db import get_db, get_engine

    get_config.cache_clear()
    get_db.cache_clear()
    get_engine.cache_clear()
    get_risk_model.cache_clear()
    app = create_app()

    with TestClient(app) as client:
        assert client.post("/v1/dev/purge", headers={"X-User-Id": "u"}).status_code == 404
        assert client.get("/docs").status_code == 404
    get_config.cache_clear()
    get_db.cache_clear()
    get_engine.cache_clear()
    get_risk_model.cache_clear()


def test_http_redirect_uri_rejected_in_production(monkeypatch, tmp_path):
    key = Fernet.generate_key().decode()
    monkeypatch.setenv("SLEEPSYNC_DB_PATH", str(tmp_path / "prod.db"))
    monkeypatch.setenv("SLEEPSYNC_ENV", "production")
    monkeypatch.setenv("TOKEN_ENCRYPTION_KEY", key)
    monkeypatch.setenv("GOOGLE_OAUTH_CLIENT_ID", "cid")
    monkeypatch.setenv("GOOGLE_OAUTH_CLIENT_SECRET", "secret")
    monkeypatch.setenv("GOOGLE_HEALTH_REDIRECT_URI", "http://localhost/callback")

    from app.config import get_config
    from app.main import create_app

    get_config.cache_clear()
    with pytest.raises(RuntimeError, match="https://"):
        create_app()
    get_config.cache_clear()


def test_unverified_wearable_rejected_in_production(monkeypatch, tmp_path):
    from app.auth import mint_test_jwt
    from tests.plan_test_helpers import plan_request

    secret = "test-jwt-secret-for-pytest-only-32bytes!!"
    monkeypatch.setenv("SLEEPSYNC_DB_PATH", str(tmp_path / "prod2.db"))
    monkeypatch.setenv("SLEEPSYNC_ENV", "production")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", secret)
    from app.config import get_config
    from app.deps import get_risk_model
    from app.main import create_app
    from fastapi.testclient import TestClient
    from storage.db import get_db, get_engine

    get_config.cache_clear()
    get_db.cache_clear()
    get_engine.cache_clear()
    get_risk_model.cache_clear()
    app = create_app()
    user = "wearable-user"
    token = mint_test_jwt(user, secret)
    with TestClient(app) as prod_client:
        plan = prod_client.post(
            "/v1/tonight/plan",
            headers={"Authorization": f"Bearer {token}"},
            json=plan_request(user),
        )
        assert plan.status_code == 200
        night_id = plan.json()["nightId"]
        res = prod_client.post(
            f"/v1/nights/{night_id}/wearable-outcome",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "userId": user,
                "bedtimeMinutes": 23 * 60,
                "wakeMinutes": 7 * 60,
                "verified": False,
            },
        )
        assert res.status_code == 403
    get_config.cache_clear()
    get_db.cache_clear()
    get_engine.cache_clear()
    get_risk_model.cache_clear()
