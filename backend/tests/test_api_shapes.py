"""Verify HTTP shapes against models/schemas.py (contract freeze)."""
from __future__ import annotations

import json
from pathlib import Path


FIXTURE = Path(__file__).parent / "fixtures" / "mock_features.json"


def _load_features() -> dict:
    return json.loads(FIXTURE.read_text())


def test_healthz(client):
    r = client.get("/healthz")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert "riskModel" in body and "optimizer" in body


def test_root_points_to_expo_web(client):
    r = client.get("/")
    assert r.status_code == 200
    assert "text/html" in r.headers.get("content-type", "")
    assert "localhost:8081" in r.text


def test_cors_allows_expo_web_origin(client):
    origin = "http://localhost:8081"
    r = client.options(
        "/v1/tonight/plan",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,x-user-id",
        },
    )
    assert r.status_code == 200
    assert r.headers.get("access-control-allow-origin") == origin

    r2 = client.get("/healthz", headers={"Origin": origin})
    assert r2.headers.get("access-control-allow-origin") == origin


def test_features_then_plan_roundtrip(client):
    features = _load_features()

    # POST /v1/features
    r = client.post("/v1/features", json=features)
    assert r.status_code == 200, r.text
    fr = r.json()
    assert fr["featureSetId"].startswith("fs-")
    assert fr["nightsAvailable"] >= 1

    # POST /v1/tonight/plan
    plan_req = {
        "userId": features["userId"],
        "featureSetId": fr["featureSetId"],
        "bedtimeMinutes": features["bedtimeMinutes"],
        "wakeMinutes": features["wakeMinutes"],
        "timezone": features["timezone"],
        "referenceNow": features["referenceNow"],
    }
    r = client.post("/v1/tonight/plan", json=plan_req)
    assert r.status_code == 200, r.text
    plan = r.json()

    # Shape: top-level
    assert plan["nightId"].startswith("night-")
    assert "profile" in plan and "riskCurve" in plan and "metadata" in plan

    # Profile shape mirrors mobile/utils/profiles.ts
    profile = plan["profile"]
    assert isinstance(profile["id"], str)
    assert profile["recommended"] in (True, False)
    assert profile["rationale"]
    assert profile["keyframes"][0] == {"t": 0.0, "dose": 0.0, "label": None} or (
        profile["keyframes"][0]["t"] == 0.0 and profile["keyframes"][0]["dose"] == 0.0
    )
    # Must end at (1, 0).
    last = profile["keyframes"][-1]
    assert last["t"] == 1.0 and last["dose"] == 0.0

    # All keyframes monotone non-decreasing in t.
    ts = [kf["t"] for kf in profile["keyframes"]]
    assert ts == sorted(ts)
    # Dose ∈ [0, 1].
    for kf in profile["keyframes"]:
        assert 0.0 <= kf["dose"] <= 1.0

    # Phases cover the window (sum of durations ≈ 1).
    total_dur = sum(p["duration"] for p in profile["phases"])
    assert abs(total_dur - 1.0) < 0.05

    # Risk curve shape
    assert len(plan["riskCurve"]) >= 8
    for pt in plan["riskCurve"]:
        assert 0.0 <= pt["t"] <= 1.0
        assert 0.0 <= pt["p"] <= 1.0

    # Metadata
    md = plan["metadata"]
    assert md["modelVersion"]
    assert "coldStart" in md
    assert isinstance(md["constraintsHit"], list)
    assert md["nightId"] == plan["nightId"]


def test_plan_validates_short_window(client):
    plan_req = {
        "userId": "demo-user",
        "bedtimeMinutes": 1380,
        "wakeMinutes": 1440 + 60,  # 1 hour
        "timezone": "UTC",
        "referenceNow": "2026-05-24T20:00:00Z",
    }
    # The naive value above is normalized mod 1440 by the validator — instead
    # pass a deliberately short window.
    plan_req["wakeMinutes"] = 60  # 23:00 → 01:00 = 120 min
    r = client.post("/v1/tonight/plan", json=plan_req)
    assert r.status_code == 422


def test_mock_features_endpoint(client):
    r = client.post("/v1/dev/mock-features", json={"scenario": "late"})
    assert r.status_code == 200
    body = r.json()
    assert body["featureSetId"].startswith("fs-mock-")

    r2 = client.post(
        "/v1/tonight/plan",
        json={
            "userId": "demo-user",
            "bedtimeMinutes": 23 * 60,
            "wakeMinutes": 7 * 60,
            "timezone": "America/New_York",
            "referenceNow": "2026-05-24T22:00:00-04:00",
        },
    )
    assert r2.status_code == 200, r2.text


def test_get_latest_plan(client):
    client.post("/v1/dev/mock-features", json={"userId": "u1"})
    plan_req = {
        "userId": "u1",
        "bedtimeMinutes": 23 * 60,
        "wakeMinutes": 7 * 60,
        "timezone": "UTC",
        "referenceNow": "2026-05-24T22:00:00Z",
    }
    p = client.post("/v1/tonight/plan", json=plan_req).json()
    g = client.get("/v1/tonight/plan", params={"userId": "u1"}).json()
    assert g["nightId"] == p["nightId"]


def test_night_record_and_debrief(client):
    client.post("/v1/dev/mock-features", json={"userId": "u2"})
    plan = client.post(
        "/v1/tonight/plan",
        json={
            "userId": "u2",
            "bedtimeMinutes": 23 * 60,
            "wakeMinutes": 7 * 60,
            "timezone": "UTC",
            "referenceNow": "2026-05-24T22:00:00Z",
        },
    ).json()
    night_id = plan["nightId"]

    # Debrief
    r = client.post(
        f"/v1/nights/{night_id}/debrief",
        json={
            "userId": "u2",
            "woke": "no",
            "groggy": 2,
            "completedAt": "2026-05-25T07:10:00Z",
            "profileId": plan["profile"]["id"],
            "startedAt": "2026-05-24T22:05:00Z",
        },
    )
    assert r.status_code == 200
    assert r.json()["outcome"] in ("good", "ok")

    r = client.post(
        f"/v1/nights/{night_id}/wearable-outcome",
        json={
            "userId": "u2",
            "bedtimeMinutes": 23 * 60,
            "wakeMinutes": 7 * 60,
            "efficiency": 0.88,
            "minutesAwake": 22,
            "fragmentationIndex": 0.15,
            "intervals": [],
        },
    )
    assert r.status_code == 204

    # Delivery
    r = client.post(
        f"/v1/nights/{night_id}/delivery",
        json={
            "userId": "u2",
            "samples": [
                {"at": "2026-05-24T23:00:00Z", "t": 0.05, "dose": 0.0, "phaseId": "delayed"},
                {"at": "2026-05-25T02:00:00Z", "t": 0.42, "dose": 0.85, "phaseId": "sustained"},
            ],
        },
    )
    assert r.status_code == 204

    # GET full record
    r = client.get(f"/v1/nights/{night_id}")
    assert r.status_code == 200
    rec = r.json()
    assert rec["nightId"] == night_id
    assert rec["debrief"]["woke"] == "no"
    assert rec["wearableOutcome"]["efficiency"] == 0.88
    assert len(rec["deliverySamples"]) == 2


def test_unknown_night_404(client):
    r = client.get("/v1/nights/does-not-exist")
    assert r.status_code == 404
