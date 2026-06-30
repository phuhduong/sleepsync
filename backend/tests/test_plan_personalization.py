"""Plan fusion: debrief feedback and optimizer constraints."""
from __future__ import annotations

from plan_test_helpers import plan_request, risk_peak_p


def test_debrief_woke_yes_raises_plan_risk_via_api(client):
    user = "debrief-shift-u"
    p1 = client.post(
        "/v1/tonight/plan",
        headers={"X-User-Id": user},
        json=plan_request(user),
    ).json()
    night_id = p1["nightId"]

    client.post(
        f"/v1/nights/{night_id}/debrief",
        headers={"X-User-Id": user},
        json={
            "userId": user,
            "woke": "yes",
            "groggy": 3,
            "completedAt": "2026-05-26T07:00:00Z",
            "profileId": p1["profile"]["id"],
            "startedAt": "2026-05-25T23:00:00Z",
        },
    )

    p2 = client.post(
        "/v1/tonight/plan",
        headers={"X-User-Id": user},
        json=plan_request(user, reference_now="2026-05-26T22:00:00Z"),
    ).json()

    assert risk_peak_p(p2["riskCurve"]) > risk_peak_p(p1["riskCurve"])


def test_high_groggy_debrief_adds_groggy_taper_constraint(client):
    user = "groggy-taper-u"
    h = {"X-User-Id": user}
    p1 = client.post(
        "/v1/tonight/plan",
        headers=h,
        json=plan_request(user),
    ).json()
    night_id = p1["nightId"]

    client.post(
        f"/v1/nights/{night_id}/debrief",
        headers=h,
        json={
            "userId": user,
            "woke": "no",
            "groggy": 5,
            "completedAt": "2026-05-26T07:00:00Z",
            "profileId": p1["profile"]["id"],
            "startedAt": "2026-05-25T23:00:00Z",
        },
    )

    p2 = client.post(
        "/v1/tonight/plan",
        headers=h,
        json=plan_request(user, reference_now="2026-05-26T22:00:00Z"),
    ).json()
    assert "groggy_taper" in p2["metadata"]["constraintsHit"]
