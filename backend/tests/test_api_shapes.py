"""Verify HTTP shapes against models/schemas.py (contract freeze)."""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from ml.time_window import (
    INTERVAL_MINUTES,
    interval_count_for_window,
    sleep_window_duration_minutes,
)
from models.schemas import PlanResponse
from plan_test_helpers import (
    assert_google_plan_metadata,
    assert_mock_plan_metadata,
    plan_request,
    user_headers,
)


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


@pytest.mark.parametrize(
    ("origin", "request_headers"),
    [
        ("http://localhost:8081", "content-type,x-user-id"),
        ("https://sleepsync.vercel.app", "content-type,authorization"),
    ],
)
def test_cors_allows_web_origin(client, origin, request_headers):
    r = client.options(
        "/v1/tonight/plan",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": request_headers,
        },
    )
    assert r.status_code == 200
    assert r.headers.get("access-control-allow-origin") == origin

    r2 = client.get("/healthz", headers={"Origin": origin})
    assert r2.headers.get("access-control-allow-origin") == origin


def test_plan_roundtrip_uses_server_fusion(client):
    """Plan is built from mock week + debrief K on the server."""
    r = client.post(
        "/v1/tonight/plan",
        json=plan_request("demo-user"),
        headers=user_headers("demo-user"),
    )
    assert r.status_code == 200, r.text
    plan = r.json()

    assert plan["nightId"].startswith("night-")
    assert "profile" in plan and "riskCurve" in plan and "metadata" in plan

    profile = plan["profile"]
    assert isinstance(profile["id"], str)
    assert profile["recommended"] in (True, False)
    assert profile["rationale"]
    assert profile["keyframes"][0] == {"t": 0.0, "dose": 0.0, "label": None} or (
        profile["keyframes"][0]["t"] == 0.0 and profile["keyframes"][0]["dose"] == 0.0
    )
    last = profile["keyframes"][-1]
    assert last["t"] == 1.0 and last["dose"] == 0.0

    ts = [kf["t"] for kf in profile["keyframes"]]
    assert ts == sorted(ts)
    for kf in profile["keyframes"]:
        assert 0.0 <= kf["dose"] <= 1.0

    total_dur = sum(p["duration"] for p in profile["phases"])
    assert abs(total_dur - 1.0) < 0.05

    assert len(plan["riskCurve"]) == interval_count_for_window(23 * 60, 7 * 60)
    for pt in plan["riskCurve"]:
        assert 0.0 <= pt["t"] <= 1.0
        assert 0.0 <= pt["p"] <= 1.0

    md = plan["metadata"]
    assert md["modelVersion"]
    assert "coldStart" in md
    assert isinstance(md["constraintsHit"], list)
    assert md["nightId"] == plan["nightId"]
    assert md["sleepDataSource"] in ("mock", "google_health")
    assert md["sleepDataReason"] in (
        "not_connected",
        "connect_failed",
        "insufficient_data",
        "using_google",
    )
    assert_mock_plan_metadata(md)


def test_plan_validates_short_window(client):
    r = client.post(
        "/v1/tonight/plan",
        json={
            "userId": "demo-user",
            "bedtimeMinutes": 23 * 60,
            "wakeMinutes": 1 * 60,  # 2-hour window (crosses midnight)
            "timezone": "UTC",
            "referenceNow": "2026-05-24T20:00:00Z",
        },
        headers=user_headers("demo-user"),
    )
    assert r.status_code == 422


def test_mock_features_scenario_shifts_risk_peak(client):
    early_user = "mock-scenario-early"
    late_user = "mock-scenario-late"

    assert client.post(
        "/v1/dev/mock-features",
        json={"userId": early_user, "scenario": "early"},
        headers=user_headers(early_user),
    ).json()["featureSetId"].startswith("fs-mock-")

    early_plan = client.post(
        "/v1/tonight/plan",
        json=plan_request(early_user),
        headers=user_headers(early_user),
    ).json()
    assert_google_plan_metadata(early_plan["metadata"])

    client.post(
        "/v1/dev/mock-features",
        json={"userId": late_user, "scenario": "late"},
        headers=user_headers(late_user),
    )
    late_plan = client.post(
        "/v1/tonight/plan",
        json=plan_request(late_user),
        headers=user_headers(late_user),
    ).json()
    assert_google_plan_metadata(late_plan["metadata"])

    early_t = max(early_plan["riskCurve"], key=lambda pt: pt["p"])["t"]
    late_t = max(late_plan["riskCurve"], key=lambda pt: pt["p"])["t"]
    assert late_t > early_t


def test_plan_risk_grid_matches_sleep_window(client):
    bedtime = 22 * 60
    wake = 4 * 60
    user = "grid-window-user"
    r = client.post(
        "/v1/tonight/plan",
        json=plan_request(user, bedtime_minutes=bedtime, wake_minutes=wake),
        headers=user_headers(user),
    )
    assert r.status_code == 200, r.text
    expected_bins = interval_count_for_window(bedtime, wake)
    assert len(r.json()["riskCurve"]) == expected_bins


def test_night_record_and_debrief(client):
    user = "u2"
    h = user_headers(user)
    plan = client.post(
        "/v1/tonight/plan",
        json=plan_request(user, reference_now="2026-05-24T22:00:00Z"),
        headers=h,
    ).json()
    night_id = plan["nightId"]

    r = client.post(
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
    assert r.status_code == 200
    assert r.json()["outcome"] in ("good", "ok")

    r = client.post(
        f"/v1/nights/{night_id}/wearable-outcome",
        headers=h,
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

    r = client.post(
        f"/v1/nights/{night_id}/delivery",
        headers=h,
        json={
            "userId": "u2",
            "samples": [
                {"at": "2026-05-24T23:00:00Z", "t": 0.05, "dose": 0.0, "phaseId": "delayed"},
                {"at": "2026-05-25T02:00:00Z", "t": 0.42, "dose": 0.85, "phaseId": "sustained"},
            ],
        },
    )
    assert r.status_code == 204

    r = client.get(f"/v1/nights/{night_id}", headers=h)
    assert r.status_code == 200
    rec = r.json()
    assert rec["nightId"] == night_id
    assert rec["debrief"]["woke"] == "no"
    assert rec["wearableOutcome"]["efficiency"] == 0.88
    assert len(rec["deliverySamples"]) == 2


def test_list_recent_nights(client):
    user = "u-list"
    h = user_headers(user)
    plan = client.post(
        "/v1/tonight/plan",
        json=plan_request(user, reference_now="2026-05-24T22:00:00Z"),
        headers=h,
    ).json()
    night_id = plan["nightId"]
    client.post(
        f"/v1/nights/{night_id}/debrief",
        headers=h,
        json={
            "userId": user,
            "woke": "no",
            "groggy": 1,
            "completedAt": "2026-05-25T07:00:00Z",
            "profileId": plan["profile"]["id"],
            "startedAt": "2026-05-24T22:05:00Z",
        },
    )
    r = client.get("/v1/nights/recent", headers={"X-User-Id": "u-list"})
    assert r.status_code == 200
    nights = r.json()
    assert len(nights) >= 1
    assert nights[0]["nightId"] == night_id
    assert nights[0]["debrief"]["groggy"] == 1


def test_unknown_night_404(client):
    r = client.get("/v1/nights/does-not-exist", headers=user_headers("someone"))
    assert r.status_code == 404


_REPO_ROOT = Path(__file__).resolve().parents[2]


def test_sleep_window_golden_fixtures():
    data = json.loads((_REPO_ROOT / "shared/sleep_window_golden.json").read_text())
    assert data["intervalMinutes"] == INTERVAL_MINUTES
    for case in data["cases"]:
        bed, wake = case["bedtimeMinutes"], case["wakeMinutes"]
        assert sleep_window_duration_minutes(bed, wake) == case["durationMinutes"], case["label"]
        assert interval_count_for_window(bed, wake) == case["intervalCount"], case["label"]


def test_plan_response_golden_fixture():
    raw = json.loads((_REPO_ROOT / "shared/contracts/plan_response.golden.json").read_text())
    plan = PlanResponse.model_validate(raw)
    assert plan.metadata.nightId == plan.nightId
    profile = raw["profile"]
    for key in ("id", "name", "recommended", "rationale", "keyframes", "phases"):
        assert key in profile
    for kf in profile["keyframes"]:
        assert "t" in kf and "dose" in kf
    for phase in profile["phases"]:
        for key in ("id", "name", "duration", "dose"):
            assert key in phase
