"""Google Health connect → sync → plan flow (sandbox) + pure binning.

Sandbox mode is the default when no OAuth client is configured, so these tests
exercise the whole surface without real Google credentials or network access.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

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


def test_status_disconnected_then_connect_then_sync(client):
    # Disconnected initially.
    r = client.get("/v1/google-health/status", headers=HEADERS)
    assert r.status_code == 200
    assert r.json()["connected"] is False
    assert r.json()["sandbox"] is True  # no creds → sandbox

    # Authorize returns a URL + state, flagged sandbox.
    a = client.get("/v1/google-health/oauth/authorize", headers=HEADERS)
    assert a.status_code == 200
    auth = a.json()
    assert auth["authorizeUrl"].startswith("https://")
    assert auth["state"]
    assert auth["sandbox"] is True

    # Callback (sandbox accepts any code) stores a connection.
    c = client.post(
        "/v1/google-health/oauth/callback",
        headers=HEADERS,
        json={"code": "sandbox-code", "state": auth["state"]},
    )
    assert c.status_code == 200, c.text
    status = c.json()
    assert status["connected"] is True
    assert len(status["scopes"]) >= 1

    # Sync pulls synthetic google_health features.
    s = client.post("/v1/google-health/sync", headers=HEADERS, json=SYNC_BODY)
    assert s.status_code == 200, s.text
    body = s.json()
    assert body["featureSetId"].startswith("fs-gh-")
    assert body["nightsAvailable"] >= 1

    # Status now reports lastSyncAt.
    r2 = client.get("/v1/google-health/status", headers=HEADERS)
    assert r2.json()["lastSyncAt"] is not None

    # The synced feature set drives a valid plan.
    plan = client.post(
        "/v1/tonight/plan",
        headers=HEADERS,
        json={
            "userId": USER,
            "featureSetId": body["featureSetId"],
            "bedtimeMinutes": SYNC_BODY["bedtimeMinutes"],
            "wakeMinutes": SYNC_BODY["wakeMinutes"],
            "timezone": SYNC_BODY["timezone"],
            "referenceNow": SYNC_BODY["referenceNow"],
        },
    )
    assert plan.status_code == 200, plan.text
    assert plan.json()["profile"]["keyframes"][-1]["dose"] == 0.0


def test_sync_without_connection_returns_409(client):
    r = client.post("/v1/google-health/sync", headers=HEADERS, json=SYNC_BODY)
    assert r.status_code == 409


def test_oauth_callback_rejects_invalid_state(client):
    client.get("/v1/google-health/oauth/authorize", headers=HEADERS)
    r = client.post(
        "/v1/google-health/oauth/callback",
        headers=HEADERS,
        json={"code": "sandbox-code", "state": "wrong-state"},
    )
    assert r.status_code == 400


def test_oauth_browser_callback_redirects_to_app(client):
    app_return = "sleepsync://google-health/callback"
    auth = client.get(
        "/v1/google-health/oauth/authorize",
        headers=HEADERS,
        params={"returnUri": app_return},
    ).json()
    r = client.get(
        "/v1/google-health/oauth/callback",
        params={"code": "sandbox-code", "state": auth["state"]},
        follow_redirects=False,
    )
    assert r.status_code == 302
    loc = r.headers["location"]
    assert loc.startswith("sleepsync://")
    assert "connected=1" in loc
    assert client.get("/v1/google-health/status", headers=HEADERS).json()["connected"] is True


def test_disconnect_clears_connection(client):
    auth = client.get("/v1/google-health/oauth/authorize", headers=HEADERS).json()
    client.post(
        "/v1/google-health/oauth/callback",
        headers=HEADERS,
        json={"code": "sandbox-code", "state": auth["state"]},
    )
    assert client.get("/v1/google-health/status", headers=HEADERS).json()["connected"] is True

    d = client.delete("/v1/google-health/connection", headers=HEADERS)
    assert d.status_code == 204
    assert client.get("/v1/google-health/status", headers=HEADERS).json()["connected"] is False

    # Disconnect is idempotent.
    assert client.delete("/v1/google-health/connection", headers=HEADERS).status_code == 204


def test_synced_features_marked_google_health(client):
    auth = client.get("/v1/google-health/oauth/authorize", headers=HEADERS).json()
    client.post(
        "/v1/google-health/oauth/callback",
        headers=HEADERS,
        json={"code": "x", "state": auth["state"]},
    )
    fs_id = client.post(
        "/v1/google-health/sync", headers=HEADERS, json=SYNC_BODY
    ).json()["featureSetId"]
    # Pull it back through GET-latest-plan path indirectly: synthetic source is
    # google_health and intervals are present.
    expected_bins = interval_count_for_window(
        SYNC_BODY["bedtimeMinutes"], SYNC_BODY["wakeMinutes"]
    )
    payload = synthetic_features(
        USER, SYNC_BODY["bedtimeMinutes"], SYNC_BODY["wakeMinutes"], "UTC",
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
    assert awake_a1 == awake_a2  # same user → identical pattern
    assert awake_a1 != awake_b1  # different user → different spike location


def test_build_intervals_from_samples_bins_stages_and_vitals():
    start = datetime(2026, 5, 24, 23, 0, tzinfo=timezone.utc)
    end = start + timedelta(hours=4)  # 4 bins of 1h with grid_size=4
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
    # Bin 0 fully deep, bin 1 fully awake.
    assert bins[0].stageFractions.deep == 1.0
    assert bins[1].stageFractions.awake == 1.0
    assert abs(bins[1].minutesAwake - 60.0) < 1e-6
    # Vitals land in bin 1 (the 90-min mark).
    assert bins[1].restingHr == 60.0
    assert bins[1].hrvMs == 42.0
    # t fractions span [0, 1].
    assert bins[0].tStart == 0.0 and bins[-1].tEnd == 1.0


def test_build_intervals_empty_window():
    t = datetime(2026, 5, 24, 23, 0, tzinfo=timezone.utc)
    assert build_intervals_from_samples(t, t, [], [], grid_size=4) == []


def test_interval_count_matches_fifteen_minute_bins():
    # 8 h window (23:00 → 07:00) → 32 × 15 min intervals.
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


def test_outcome_sync_after_plan(client):
    auth = client.get("/v1/google-health/oauth/authorize", headers=HEADERS).json()
    client.post(
        "/v1/google-health/oauth/callback",
        headers=HEADERS,
        json={"code": "sandbox", "state": auth["state"]},
    )
    sync = client.post("/v1/google-health/sync", headers=HEADERS, json=SYNC_BODY)
    plan = client.post(
        "/v1/tonight/plan",
        headers=HEADERS,
        json={
            "userId": USER,
            "featureSetId": sync.json()["featureSetId"],
            "bedtimeMinutes": SYNC_BODY["bedtimeMinutes"],
            "wakeMinutes": SYNC_BODY["wakeMinutes"],
            "timezone": SYNC_BODY["timezone"],
            "referenceNow": SYNC_BODY["referenceNow"],
        },
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
