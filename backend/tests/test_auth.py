"""Supabase JWT auth tests."""
from __future__ import annotations

from app.auth import mint_test_jwt
from tests.plan_test_helpers import plan_request


def test_jwt_auth_when_secret_configured(client, monkeypatch):
    secret = "test-jwt-secret-for-pytest-only-32bytes!!"
    monkeypatch.setenv("SUPABASE_JWT_SECRET", secret)
    user = "jwt-user-1"
    token = mint_test_jwt(user, secret)
    res = client.post(
        "/v1/tonight/plan",
        headers={"Authorization": f"Bearer {token}"},
        json=plan_request(user),
    )
    assert res.status_code == 200
    assert res.json()["nightId"]


def test_jwt_user_mismatch_rejected(client, monkeypatch):
    secret = "test-jwt-secret-for-pytest-only-32bytes!!"
    monkeypatch.setenv("SUPABASE_JWT_SECRET", secret)
    token = mint_test_jwt("real-user", secret)
    res = client.post(
        "/v1/tonight/plan",
        headers={"Authorization": f"Bearer {token}"},
        json=plan_request("other-user"),
    )
    assert res.status_code == 403
