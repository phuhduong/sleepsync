"""Plan refresh reuses the same open night row until debrief."""
from __future__ import annotations

import json
from pathlib import Path

FIXTURE = Path(__file__).parent / "fixtures" / "mock_features.json"


def _plan_body(features: dict, feature_set_id: str, night_id: str | None = None) -> dict:
    body = {
        "userId": features["userId"],
        "featureSetId": feature_set_id,
        "bedtimeMinutes": features["bedtimeMinutes"],
        "wakeMinutes": features["wakeMinutes"],
        "timezone": features["timezone"],
        "referenceNow": features["referenceNow"],
    }
    if night_id is not None:
        body["nightId"] = night_id
    return body


def test_plan_reuses_open_night_until_debrief(client):
    features = json.loads(FIXTURE.read_text())
    r = client.post("/v1/features", json=features)
    assert r.status_code == 200
    fs_id = r.json()["featureSetId"]

    plan_req = _plan_body(features, fs_id)
    p1 = client.post("/v1/tonight/plan", json=plan_req).json()
    night_id = p1["nightId"]

    p2 = client.post("/v1/tonight/plan", json=_plan_body(features, fs_id, night_id)).json()
    assert p2["nightId"] == night_id

    debrief = {
        "userId": features["userId"],
        "woke": "no",
        "groggy": 2,
        "completedAt": "2026-05-26T08:00:00Z",
        "profileId": p1["profile"]["id"],
        "startedAt": "2026-05-26T22:00:00Z",
    }
    d = client.post(f"/v1/nights/{night_id}/debrief", json=debrief)
    assert d.status_code == 200

    p3 = client.post("/v1/tonight/plan", json=_plan_body(features, fs_id, night_id)).json()
    assert p3["nightId"] != night_id
