"""Plan refresh reuses the same open night row until debrief."""
from __future__ import annotations

from plan_test_helpers import plan_request, user_headers


def test_plan_reuses_open_night_until_debrief(client):
    user = "night-reuse-u"
    body = plan_request(user)
    h = user_headers(user)

    p1 = client.post("/v1/tonight/plan", json=body, headers=h).json()
    night_id = p1["nightId"]
    profile_id = p1["profile"]["id"]

    p2 = client.post(
        "/v1/tonight/plan",
        json={**body, "nightId": night_id},
        headers=h,
    ).json()
    assert p2["nightId"] == night_id
    assert p2["profile"]["id"] == profile_id

    debrief = {
        "userId": user,
        "woke": "no",
        "groggy": 2,
        "completedAt": "2026-05-26T08:00:00Z",
        "profileId": p1["profile"]["id"],
        "startedAt": "2026-05-26T22:00:00Z",
    }
    d = client.post(f"/v1/nights/{night_id}/debrief", json=debrief, headers=h)
    assert d.status_code == 200

    p3 = client.post(
        "/v1/tonight/plan",
        json={**body, "nightId": night_id},
        headers=h,
    ).json()
    assert p3["nightId"] != night_id


def test_plan_force_regenerate_updates_metadata(client):
    user = "night-force-u"
    body = plan_request(user)
    h = user_headers(user)

    p1 = client.post("/v1/tonight/plan", json=body, headers=h).json()
    night_id = p1["nightId"]

    p2 = client.post(
        "/v1/tonight/plan",
        json={**body, "nightId": night_id, "forceRegenerate": True},
        headers=h,
    ).json()
    assert p2["nightId"] == night_id
    assert p2["metadata"]["generatedAt"] != p1["metadata"]["generatedAt"]


def test_plan_cache_skips_regeneration(client):
    user = "night-cache-u"
    body = plan_request(user)
    h = user_headers(user)

    p1 = client.post("/v1/tonight/plan", json=body, headers=h).json()
    p2 = client.post(
        "/v1/tonight/plan",
        json={**body, "nightId": p1["nightId"]},
        headers=h,
    ).json()
    assert p2["profile"]["id"] == p1["profile"]["id"]
    assert p2["metadata"]["generatedAt"] == p1["metadata"]["generatedAt"]
