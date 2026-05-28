"""Dev purge clears persisted user data."""
from __future__ import annotations

from plan_test_helpers import plan_request


def test_dev_purge_clears_nights_and_features(client):
    plan = client.post(
        "/v1/tonight/plan",
        json=plan_request("purge-u", reference_now="2026-05-24T22:00:00Z"),
    ).json()

    r = client.post("/v1/dev/purge", headers={"X-User-Id": "purge-u"})
    assert r.status_code == 204

    assert client.get("/v1/tonight/plan", params={"userId": "purge-u"}).status_code == 404
    assert (
        client.get(f"/v1/nights/{plan['nightId']}", headers={"X-User-Id": "purge-u"}).status_code
        == 404
    )
