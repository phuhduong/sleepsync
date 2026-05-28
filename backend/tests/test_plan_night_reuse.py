"""Plan refresh reuses the same open night row until debrief."""
from __future__ import annotations

from plan_test_helpers import plan_request


def test_plan_reuses_open_night_until_debrief(client):
    user = "night-reuse-u"
    body = plan_request(user)

    p1 = client.post("/v1/tonight/plan", json=body).json()
    night_id = p1["nightId"]

    p2 = client.post(
        "/v1/tonight/plan",
        json={**body, "nightId": night_id},
    ).json()
    assert p2["nightId"] == night_id

    debrief = {
        "userId": user,
        "woke": "no",
        "groggy": 2,
        "completedAt": "2026-05-26T08:00:00Z",
        "profileId": p1["profile"]["id"],
        "startedAt": "2026-05-26T22:00:00Z",
    }
    d = client.post(f"/v1/nights/{night_id}/debrief", json=debrief)
    assert d.status_code == 200

    p3 = client.post(
        "/v1/tonight/plan",
        json={**body, "nightId": night_id},
    ).json()
    assert p3["nightId"] != night_id
