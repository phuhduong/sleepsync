"""Google Health connect → sync → plan flow + pure binning."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from gh_test_helpers import connect_test_user, mock_google_health_live
from integrations.google_health import (
    INTERVAL_MINUTES,
    SleepSegment,
    VitalSample,
    _parse_v4_sleep_segments,
    build_intervals_from_samples,
    interval_count_for_window,
    synthetic_features,
)

USER = "11111111-2222-4333-8444-555555555555"
HEADERS = {"X-User-Id": USER}
SYNC_BODY = {
    "bedtimeMinutes": 23 * 60,
    "wakeMinutes": 7 * 60,
    "timezone": "America/New_York",
    "referenceNow": "2026-05-25T20:00:00-04:00",
}


def test_status_requires_user_header(client):
    r = client.get("/v1/google-health/status")
    assert r.status_code == 400


def test_authorize_requires_oauth_config(client):
    r = client.get("/v1/google-health/oauth/authorize", headers=HEADERS)
    assert r.status_code == 503


def test_status_disconnected_then_connect_then_sync(client, monkeypatch):
    r = client.get("/v1/google-health/status", headers=HEADERS)
    assert r.status_code == 200
    assert r.json()["connected"] is False

    connect_test_user(client, HEADERS, monkeypatch)

    s = client.post("/v1/google-health/sync", headers=HEADERS, json=SYNC_BODY)
    assert s.status_code == 200, s.text
    body = s.json()
    assert body["featureSetId"].startswith("fs-gh-")
    assert body["nightsAvailable"] >= 1

    r2 = client.get("/v1/google-health/status", headers=HEADERS)
    assert r2.json()["lastSyncAt"] is not None

    from plan_test_helpers import assert_google_plan_metadata, plan_request

    plan = client.post(
        "/v1/tonight/plan",
        headers=HEADERS,
        json=plan_request(
            USER,
            timezone=SYNC_BODY["timezone"],
            reference_now=SYNC_BODY["referenceNow"],
        ),
    )
    assert plan.status_code == 200, plan.text
    assert_google_plan_metadata(plan.json()["metadata"])
    assert plan.json()["profile"]["keyframes"][-1]["dose"] == 0.0


def test_sync_insufficient_sleep_returns_422(client, monkeypatch):
    connect_test_user(client, HEADERS, monkeypatch)
    from models.schemas import FeaturesPayload, IntervalFeature, StageFractions

    empty = FeaturesPayload(
        userId=USER,
        timezone="America/New_York",
        referenceNow=datetime.now(timezone.utc),
        bedtimeMinutes=SYNC_BODY["bedtimeMinutes"],
        wakeMinutes=SYNC_BODY["wakeMinutes"],
        source="google_health",
        intervalMinutes=15,
        intervals=[
            IntervalFeature(
                index=0,
                tStart=0,
                tEnd=1,
                stageFractions=StageFractions(awake=0, light=1, deep=0, rem=0),
                minutesAwake=0,
            )
        ],
    )

    import integrations.google_health as gh_mod

    monkeypatch.setattr(gh_mod, "fetch_window_features", lambda *a, **k: empty)
    r = client.post("/v1/google-health/sync", headers=HEADERS, json=SYNC_BODY)
    assert r.status_code == 422

    plan = client.post(
        "/v1/tonight/plan",
        headers=HEADERS,
        json={
            "userId": USER,
            "bedtimeMinutes": SYNC_BODY["bedtimeMinutes"],
            "wakeMinutes": SYNC_BODY["wakeMinutes"],
            "timezone": SYNC_BODY["timezone"],
            "referenceNow": SYNC_BODY["referenceNow"],
        },
    )
    assert plan.status_code == 200
    assert plan.json()["metadata"]["sleepDataReason"] == "insufficient_data"


def test_sync_without_connection_returns_409(client):
    r = client.post("/v1/google-health/sync", headers=HEADERS, json=SYNC_BODY)
    assert r.status_code == 409


def test_oauth_callback_rejects_invalid_state(client, monkeypatch):
    mock_google_health_live(monkeypatch)
    client.get("/v1/google-health/oauth/authorize", headers=HEADERS)
    r = client.post(
        "/v1/google-health/oauth/callback",
        headers=HEADERS,
        json={"code": "test-code", "state": "wrong-state"},
    )
    assert r.status_code == 400


def test_oauth_browser_callback_redirects_to_app(client, monkeypatch):
    app_return = "sleepsync://google-health/callback"
    mock_google_health_live(monkeypatch)
    auth = client.get(
        "/v1/google-health/oauth/authorize",
        headers=HEADERS,
        params={"returnUri": app_return},
    ).json()
    r = client.get(
        "/v1/google-health/oauth/callback",
        params={"code": "test-code", "state": auth["state"]},
        follow_redirects=False,
    )
    assert r.status_code == 302
    loc = r.headers["location"]
    assert loc.startswith("sleepsync://")
    assert "connected=1" in loc
    assert client.get("/v1/google-health/status", headers=HEADERS).json()["connected"] is True


def test_disconnect_clears_connection(client, monkeypatch):
    connect_test_user(client, HEADERS, monkeypatch)
    assert client.get("/v1/google-health/status", headers=HEADERS).json()["connected"] is True

    d = client.delete("/v1/google-health/connection", headers=HEADERS)
    assert d.status_code == 204
    assert client.get("/v1/google-health/status", headers=HEADERS).json()["connected"] is False
    assert client.delete("/v1/google-health/connection", headers=HEADERS).status_code == 204


def test_synced_features_marked_google_health(client, monkeypatch):
    connect_test_user(client, HEADERS, monkeypatch)
    fs_id = client.post(
        "/v1/google-health/sync", headers=HEADERS, json=SYNC_BODY
    ).json()["featureSetId"]
    expected_bins = interval_count_for_window(
        SYNC_BODY["bedtimeMinutes"], SYNC_BODY["wakeMinutes"]
    )
    payload = synthetic_features(
        USER,
        SYNC_BODY["bedtimeMinutes"],
        SYNC_BODY["wakeMinutes"],
        "UTC",
        datetime.now(timezone.utc),
    )
    assert payload.source == "google_health"
    assert payload.intervalMinutes == INTERVAL_MINUTES
    assert len(payload.intervals) == expected_bins
    assert fs_id.startswith("fs-gh-")


def test_synthetic_features_deterministic_per_user():
    now = datetime(2026, 5, 25, tzinfo=timezone.utc)
    a1 = synthetic_features("user-a", 1380, 420, "UTC", now)
    a2 = synthetic_features("user-a", 1380, 420, "UTC", now)
    b1 = synthetic_features("user-b", 1380, 420, "UTC", now)
    awake_a1 = [i.stageFractions.awake for i in a1.intervals]
    awake_a2 = [i.stageFractions.awake for i in a2.intervals]
    awake_b1 = [i.stageFractions.awake for i in b1.intervals]
    assert awake_a1 == awake_a2
    assert awake_a1 != awake_b1


def test_build_intervals_from_samples_bins_stages_and_vitals():
    start = datetime(2026, 5, 24, 23, 0, tzinfo=timezone.utc)
    end = start + timedelta(hours=4)
    segments = [
        SleepSegment(start=start, end=start + timedelta(hours=1), stage="deep"),
        SleepSegment(start + timedelta(hours=1), start + timedelta(hours=2), "awake"),
        SleepSegment(start + timedelta(hours=2), end, "light"),
    ]
    vitals = [
        VitalSample(at=start + timedelta(minutes=90), hr=60.0),
        VitalSample(at=start + timedelta(minutes=90), hrv=42.0),
    ]
    bins = build_intervals_from_samples(start, end, segments, vitals, grid_size=4)
    assert len(bins) == 4
    assert bins[0].stageFractions.deep == 1.0
    assert bins[1].stageFractions.awake == 1.0
    assert abs(bins[1].minutesAwake - 60.0) < 1e-6
    assert bins[1].restingHr == 60.0
    assert bins[1].hrvMs == 42.0
    assert bins[0].tStart == 0.0 and bins[-1].tEnd == 1.0


def test_build_intervals_empty_window():
    t = datetime(2026, 5, 24, 23, 0, tzinfo=timezone.utc)
    assert build_intervals_from_samples(t, t, [], [], grid_size=4) == []


def test_interval_count_matches_fifteen_minute_bins():
    assert interval_count_for_window(23 * 60, 7 * 60) == 32


def test_parse_v4_sleep_stages():
    pts = [
        {
            "sleep": {
                "stages": [
                    {
                        "startTime": "2026-05-24T23:00:00Z",
                        "endTime": "2026-05-25T01:00:00Z",
                        "type": "DEEP",
                    },
                    {
                        "startTime": "2026-05-25T01:00:00Z",
                        "endTime": "2026-05-25T01:30:00Z",
                        "type": "AWAKE",
                    },
                ]
            }
        }
    ]
    segs = _parse_v4_sleep_segments(pts)
    assert len(segs) == 2
    assert segs[0].stage == "deep"
    assert segs[1].stage == "awake"


def test_outcome_sync_after_plan(client, monkeypatch):
    connect_test_user(client, HEADERS, monkeypatch)
    client.post("/v1/google-health/sync", headers=HEADERS, json=SYNC_BODY)
    from plan_test_helpers import plan_request

    plan = client.post(
        "/v1/tonight/plan",
        headers=HEADERS,
        json=plan_request(
            USER,
            timezone=SYNC_BODY["timezone"],
            reference_now=SYNC_BODY["referenceNow"],
        ),
    )
    night_id = plan.json()["nightId"]
    out = client.post(
        "/v1/google-health/outcome-sync",
        headers=HEADERS,
        json={**SYNC_BODY, "nightId": night_id},
    )
    assert out.status_code == 204, out.text
    night = client.get(f"/v1/nights/{night_id}", headers=HEADERS)
    assert night.json()["wearableOutcome"] is not None
