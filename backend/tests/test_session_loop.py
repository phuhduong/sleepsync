from __future__ import annotations

from plan_test_helpers import plan_request, user_headers


def test_full_session_loop_plan_delivery_debrief_list(client):
    user = "loop-user"
    h = user_headers(user)

    plan_res = client.post(
        "/v1/tonight/plan",
        json=plan_request(user, reference_now="2026-05-24T22:00:00Z"),
        headers=h,
    )
    assert plan_res.status_code == 200, plan_res.text
    plan = plan_res.json()
    night_id = plan["nightId"]

    delivery_res = client.post(
        f"/v1/nights/{night_id}/delivery",
        headers=h,
        json={
            "userId": user,
            "samples": [
                {"at": "2026-05-24T23:00:00Z", "t": 0.05, "dose": 0.0, "phaseId": "delayed"},
                {"at": "2026-05-25T02:00:00Z", "t": 0.42, "dose": 0.85, "phaseId": "sustained"},
            ],
        },
    )
    assert delivery_res.status_code == 204

    debrief_res = client.post(
        f"/v1/nights/{night_id}/debrief",
        headers=h,
        json={
            "userId": user,
            "woke": "no",
            "groggy": 2,
            "completedAt": "2026-05-25T07:10:00Z",
            "profileId": plan["profile"]["id"],
            "startedAt": "2026-05-24T22:05:00Z",
        },
    )
    assert debrief_res.status_code == 200
    assert debrief_res.json()["outcome"] in ("good", "ok")

    night_res = client.get(f"/v1/nights/{night_id}", headers=h)
    assert night_res.status_code == 200
    record = night_res.json()
    assert len(record["deliverySamples"]) == 2
    assert record["debrief"]["woke"] == "no"

    list_res = client.get("/v1/nights/recent", headers=h)
    assert list_res.status_code == 200
    nights = list_res.json()
    assert len(nights) >= 1
    assert nights[0]["nightId"] == night_id
    assert nights[0]["debrief"]["groggy"] == 2
