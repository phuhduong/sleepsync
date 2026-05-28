"""Plan fusion: mock week, debrief K, google_health history."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from ml.mock_sleep_bank import aggregate_mock_intervals
from ml.plan_inputs import rollups_from_debriefs
from ml.risk_model import RiskModel
from ml.features import rollup_vector
from models.schemas import DebriefRequest

from plan_test_helpers import (
    assert_google_plan_metadata,
    assert_mock_plan_metadata,
    plan_request,
    profile_keyframes,
    risk_peak_p,
)

FIXTURE = Path(__file__).parent / "fixtures" / "mock_features.json"


def test_debrief_rollups_shift_risk(risk_model: RiskModel):
    grid = 32
    payload = aggregate_mock_intervals(23 * 60, 7 * 60)
    no_debrief = risk_model.predict(
        payload, rollup_vector(None), grid_size=grid, nights_available=0, cold_start_threshold=3
    )
    debriefs = [
        DebriefRequest(
            userId="u",
            woke="yes",
            groggy=3,
            completedAt=datetime.now(timezone.utc),
            profileId="p",
            startedAt=datetime.now(timezone.utc),
        )
    ]
    rollups = rollups_from_debriefs(debriefs)
    with_debrief = risk_model.predict(
        payload,
        rollup_vector(rollups, woke_rate_7d=1.0),
        grid_size=grid,
        nights_available=0,
        cold_start_threshold=3,
    )
    assert float(with_debrief.p.max()) > float(no_debrief.p.max())


def test_plan_uses_mock_provenance_without_google_nights(client):
    plan = client.post(
        "/v1/tonight/plan",
        headers={"X-User-Id": "personalize-u"},
        json=plan_request("personalize-u"),
    )
    assert plan.status_code == 200, plan.text
    assert_mock_plan_metadata(plan.json()["metadata"])


def test_plan_ignores_uploaded_mock_feature_set(client):
    """POST /v1/features still stores rows, but build_plan only uses google_health or fixtures."""
    user = "ignore-mock-u"
    baseline = client.post(
        "/v1/tonight/plan",
        headers={"X-User-Id": user},
        json=plan_request(user),
    ).json()

    skewed = json.loads(FIXTURE.read_text())
    skewed["userId"] = user
    skewed["source"] = "mock"
    # Extreme awake-only bins — would dominate risk if latest_feature_set were used.
    for iv in skewed["intervals"]:
        iv["stageFractions"] = {"awake": 0.95, "light": 0.05, "deep": 0.0, "rem": 0.0}
        iv["minutesAwake"] = 14.0

    up = client.post("/v1/features", json=skewed)
    assert up.status_code == 200

    after = client.post(
        "/v1/tonight/plan",
        headers={"X-User-Id": user},
        json=plan_request(user),
    ).json()

    assert_mock_plan_metadata(after["metadata"])
    assert profile_keyframes(baseline["profile"]) == profile_keyframes(after["profile"])
    assert risk_peak_p(baseline["riskCurve"]) == risk_peak_p(after["riskCurve"])


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


def test_plan_uses_google_health_after_sufficient_sync(client, monkeypatch):
    """Sync stores google_health rows; plan provenance reflects Google path."""
    from gh_test_helpers import connect_test_user

    headers = {"X-User-Id": "gh-plan-u"}
    connect_test_user(client, headers, monkeypatch)
    sync = client.post(
        "/v1/google-health/sync",
        headers=headers,
        json={
            "bedtimeMinutes": 23 * 60,
            "wakeMinutes": 7 * 60,
            "timezone": "America/New_York",
            "referenceNow": "2026-05-25T20:00:00-04:00",
        },
    )
    assert sync.status_code == 200, sync.text

    plan = client.post(
        "/v1/tonight/plan",
        headers=headers,
        json=plan_request("gh-plan-u", timezone="America/New_York"),
    )
    assert plan.status_code == 200, plan.text
    assert_google_plan_metadata(plan.json()["metadata"])
