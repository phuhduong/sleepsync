"""Dev purge clears persisted user data."""
from __future__ import annotations

from plan_test_helpers import plan_request, user_headers


def test_dev_purge_clears_nights_and_features(client):
    user = "purge-u"
    plan = client.post(
        "/v1/tonight/plan",
        json=plan_request(user, reference_now="2026-05-24T22:00:00Z"),
        headers=user_headers(user),
    ).json()

    r = client.post("/v1/dev/purge", headers=user_headers(user))
    assert r.status_code == 204

    assert client.get(f"/v1/nights/{plan['nightId']}", headers=user_headers(user)).status_code == 404
