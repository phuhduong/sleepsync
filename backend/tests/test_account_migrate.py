from __future__ import annotations

import uuid

from app.auth import mint_test_jwt
from tests.plan_test_helpers import plan_request, user_headers


def test_reassign_user_data_moves_nights_and_features(client, monkeypatch):
    anon = f"anon-{uuid.uuid4()}"
    auth = f"auth-{uuid.uuid4()}"
    anon_h = user_headers(anon)

    plan = client.post(
        "/v1/tonight/plan",
        json=plan_request(anon),
        headers=anon_h,
    ).json()
    night_id = plan["nightId"]

    client.post(
        f"/v1/nights/{night_id}/debrief",
        headers=anon_h,
        json={
            "userId": anon,
            "woke": "no",
            "groggy": 2,
            "completedAt": "2026-05-25T07:10:00Z",
            "profileId": plan["profile"]["id"],
            "startedAt": "2026-05-24T22:05:00Z",
        },
    )

    client.post(
        "/v1/dev/mock-features",
        json={"userId": anon, "scenario": "middle"},
        headers=anon_h,
    )

    secret = "test-jwt-secret-for-pytest-only-32bytes!!"
    monkeypatch.setenv("SUPABASE_JWT_SECRET", secret)
    token = mint_test_jwt(auth, secret)

    migrate = client.post(
        "/v1/account/migrate",
        headers={"Authorization": f"Bearer {token}"},
        json={"fromUserId": anon},
    )
    assert migrate.status_code == 200, migrate.text
    body = migrate.json()
    assert body["nightsMoved"] == 1
    assert body["featureSetsMoved"] == 1

    recent = client.get(
        "/v1/nights/recent",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert recent.status_code == 200
    nights = recent.json()
    assert any(n["nightId"] == night_id for n in nights)
    assert all(n["userId"] == auth for n in nights)

    monkeypatch.delenv("SUPABASE_JWT_SECRET", raising=False)
    anon_recent = client.get("/v1/nights/recent", headers=anon_h)
    assert anon_recent.status_code == 200
    assert anon_recent.json() == []


def test_migrate_same_user_is_noop(client):
    user = "noop-user"
    h = user_headers(user)
    r = client.post("/v1/account/migrate", headers=h, json={"fromUserId": user})
    assert r.status_code == 200
    assert r.json() == {
        "nightsMoved": 0,
        "featureSetsMoved": 0,
        "connectionMoved": False,
    }
