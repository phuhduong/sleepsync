"""Test doubles for Google Health OAuth + API (no sandbox mode in production)."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from cryptography.fernet import Fernet

from ml.time_window import interval_count_for_window, sleep_window_duration_minutes
from integrations.google_health import (
    TokenBundle,
)
from synthetic_google_health import synthetic_features


def enable_google_oauth_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GOOGLE_OAUTH_CLIENT_ID", "test-client-id.apps.googleusercontent.com")
    monkeypatch.setenv("GOOGLE_OAUTH_CLIENT_SECRET", "test-secret")
    monkeypatch.setenv("TOKEN_ENCRYPTION_KEY", Fernet.generate_key().decode())
    from app.config import get_config

    get_config.cache_clear()


def mock_google_health_live(monkeypatch: pytest.MonkeyPatch) -> None:
    """Pretend OAuth is configured and return deterministic feature payloads (no HTTP)."""
    enable_google_oauth_env(monkeypatch)
    import integrations.google_health as gh_mod

    def exchange(config, code, redirect_uri):  # noqa: ARG001
        return TokenBundle(
            access_token="test-access",
            refresh_token="test-refresh",
            scopes=list(config.scopes),
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )

    def refresh(config, refresh_token):  # noqa: ARG001
        return exchange(config, "", config.redirect_uri)

    def fetch_window(
        config,  # noqa: ARG001
        access_token,  # noqa: ARG001
        user_id,
        bedtime_minutes,
        wake_minutes,
        timezone_name,
        reference_now,
    ):
        grid = interval_count_for_window(bedtime_minutes, wake_minutes)
        return synthetic_features(
            user_id, bedtime_minutes, wake_minutes, timezone_name, reference_now, grid
        )

    def fetch_outcome(
        config,  # noqa: ARG001
        access_token,  # noqa: ARG001
        user_id,
        bedtime_minutes,
        wake_minutes,
        reference_now,
    ):
        payload = fetch_window(
            config,
            access_token,
            user_id,
            bedtime_minutes,
            wake_minutes,
            "UTC",
            reference_now,
        )
        awake_mins = sum(iv.minutesAwake or 0.0 for iv in payload.intervals)
        window_mins = sleep_window_duration_minutes(bedtime_minutes, wake_minutes)
        efficiency = max(0.0, 1.0 - awake_mins / max(window_mins, 1))
        from models.schemas import WearableOutcomeRequest

        return WearableOutcomeRequest(
            userId=user_id,
            bedtimeMinutes=bedtime_minutes,
            wakeMinutes=wake_minutes,
            actualBedtime=reference_now,
            actualWake=reference_now,
            efficiency=round(efficiency, 3),
            minutesAwake=round(awake_mins, 1),
            fragmentationIndex=round(min(1.0, awake_mins / max(window_mins, 1)), 3),
            intervals=payload.intervals,
        )

    monkeypatch.setattr(gh_mod, "exchange_code", exchange)
    monkeypatch.setattr(gh_mod, "refresh_access_token", refresh)
    monkeypatch.setattr(gh_mod, "fetch_window_features", fetch_window)
    monkeypatch.setattr(gh_mod, "fetch_outcome", fetch_outcome)


def connect_test_user(client, headers: dict, monkeypatch: pytest.MonkeyPatch) -> dict:
    """OAuth authorize + callback; returns authorize JSON (includes state)."""
    mock_google_health_live(monkeypatch)
    auth = client.get("/v1/google-health/oauth/authorize", headers=headers)
    assert auth.status_code == 200, auth.text
    body = auth.json()
    cb = client.post(
        "/v1/google-health/oauth/callback",
        headers=headers,
        json={"code": "test-code", "state": body["state"]},
    )
    assert cb.status_code == 200, cb.text
    return body
