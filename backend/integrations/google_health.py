"""Google Health OAuth, REST, and test helpers."""
from __future__ import annotations

import logging
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from app.config import GoogleHealthConfig
from ml.time_window import INTERVAL_MINUTES, interval_count_for_window
from models.schemas import (
    FeatureRollups,
    FeaturesPayload,
    WearableOutcomeRequest,
)

from integrations.google_health_parse import (
    SleepSegment,
    VitalSample,
    build_intervals_from_samples,
    parse_v4_heart_rate,
    parse_v4_hrv,
    parse_v4_sleep_segments,
)

class GoogleHealthError(RuntimeError):
    """Raised when a live Google Health / OAuth call fails."""


@dataclass
class TokenBundle:
    access_token: str
    refresh_token: str
    scopes: list[str]
    expires_at: datetime


def make_state() -> str:
    return secrets.token_urlsafe(24)


def authorize_url(config: GoogleHealthConfig, state: str, redirect_uri: str) -> str:
    from urllib.parse import urlencode

    if not config.client_id:
        raise GoogleHealthError("Google OAuth client_id is not configured")
    params = {
        "client_id": config.client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
        "scope": " ".join(config.scopes),
        "state": state,
    }
    return f"{config.authorize_url}?{urlencode(params)}"


def exchange_code(
    config: GoogleHealthConfig, code: str, redirect_uri: str
) -> TokenBundle:
    return _token_request(
        config,
        {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri,
            "client_id": config.client_id,
            "client_secret": config.client_secret,
        },
        keep_refresh=None,
    )


def refresh_access_token(
    config: GoogleHealthConfig, refresh_token: str
) -> TokenBundle:
    return _token_request(
        config,
        {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": config.client_id,
            "client_secret": config.client_secret,
        },
        keep_refresh=refresh_token,
    )


def revoke(config: GoogleHealthConfig, refresh_token: str) -> None:
    if not refresh_token:
        return
    import httpx

    try:
        httpx.post(
            config.revoke_url,
            data={"token": refresh_token},
            headers={"content-type": "application/x-www-form-urlencoded"},
            timeout=10.0,
        )
    except Exception:  # best-effort revoke; never raise on disconnect
        logging.getLogger(__name__).warning(
            "Google token revoke failed", exc_info=True
        )


def _token_request(
    config: GoogleHealthConfig, data: dict[str, str], keep_refresh: str | None
) -> TokenBundle:
    import httpx

    try:
        resp = httpx.post(
            config.token_url,
            data=data,
            headers={"content-type": "application/x-www-form-urlencoded"},
            timeout=15.0,
        )
        resp.raise_for_status()
        body = resp.json()
    except Exception as exc:  # noqa: BLE001
        raise GoogleHealthError(f"token endpoint failed: {type(exc).__name__}") from exc

    refresh = body.get("refresh_token") or keep_refresh
    if not refresh:
        raise GoogleHealthError("no refresh_token returned (need access_type=offline)")
    expires_in = int(body.get("expires_in", 3600))
    scopes = (body.get("scope") or " ".join(config.scopes)).split()
    return TokenBundle(
        access_token=body["access_token"],
        refresh_token=refresh,
        scopes=scopes,
        expires_at=datetime.now(timezone.utc) + timedelta(seconds=expires_in),
    )


def fetch_window_features(
    config: GoogleHealthConfig,
    access_token: str,
    user_id: str,
    bedtime_minutes: int,
    wake_minutes: int,
    timezone_name: str,
    reference_now: datetime,
) -> FeaturesPayload:
    """Build a window-normalized FeaturesPayload from Google Health data."""
    grid = interval_count_for_window(bedtime_minutes, wake_minutes)
    window_start, window_end = _last_night_window(bedtime_minutes, wake_minutes, reference_now)
    segments, vitals, rollups = _fetch_live(
        config, access_token, window_start, window_end
    )
    intervals = build_intervals_from_samples(
        window_start, window_end, segments, vitals, grid
    )
    return FeaturesPayload(
        userId=user_id,
        timezone=timezone_name,
        referenceNow=reference_now,
        bedtimeMinutes=bedtime_minutes,
        wakeMinutes=wake_minutes,
        source="google_health",
        intervalMinutes=INTERVAL_MINUTES,
        intervals=intervals,
        rollups=rollups,
    )


def fetch_outcome(
    config: GoogleHealthConfig,
    access_token: str,
    user_id: str,
    bedtime_minutes: int,
    wake_minutes: int,
    reference_now: datetime,
) -> WearableOutcomeRequest:
    """Post-wake summary from the most recent completed sleep session."""
    grid = interval_count_for_window(bedtime_minutes, wake_minutes)
    window_start, window_end = _last_night_window(bedtime_minutes, wake_minutes, reference_now)
    segments, vitals, _ = _fetch_live(config, access_token, window_start, window_end)
    intervals = build_intervals_from_samples(window_start, window_end, segments, vitals, grid)
    awake_mins = sum(iv.minutesAwake or 0.0 for iv in intervals)
    window_mins = max((window_end - window_start).total_seconds() / 60.0, 1.0)
    efficiency = max(0.0, 1.0 - awake_mins / window_mins)
    return WearableOutcomeRequest(
        userId=user_id,
        bedtimeMinutes=bedtime_minutes,
        wakeMinutes=wake_minutes,
        actualBedtime=window_start,
        actualWake=window_end,
        efficiency=round(efficiency, 3),
        minutesAwake=round(awake_mins, 1),
        fragmentationIndex=round(min(1.0, awake_mins / window_mins), 3),
        intervals=intervals,
    )


def _fetch_live(
    config: GoogleHealthConfig,
    access_token: str,
    window_start: datetime,
    window_end: datetime,
) -> tuple[list[SleepSegment], list[VitalSample], FeatureRollups | None]:
    """Pull sleep + vitals via Google Health API v4 list endpoints."""
    import httpx

    start_iso = window_start.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    end_iso = window_end.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    sleep_filter = (
        f'sleep.interval.end_time >= "{start_iso}" AND sleep.interval.end_time < "{end_iso}"'
    )
    hr_filter = (
        f'heart_rate.sample_time.physical_time >= "{start_iso}" AND '
        f'heart_rate.sample_time.physical_time < "{end_iso}"'
    )
    hrv_filter = (
        f'heart_rate_variability.sample_time.physical_time >= "{start_iso}" AND '
        f'heart_rate_variability.sample_time.physical_time < "{end_iso}"'
    )

    headers = {"authorization": f"Bearer {access_token}"}
    try:
        with httpx.Client(base_url=config.api_base, headers=headers, timeout=25.0) as client:
            sleep_pts = _list_v4_data_points(client, "sleep", sleep_filter)
            hr_pts = _list_v4_data_points(client, "heart-rate", hr_filter)
            try:
                hrv_pts = _list_v4_data_points(client, "heart-rate-variability", hrv_filter)
            except GoogleHealthError:
                hrv_pts = []
    except Exception as exc:  # noqa: BLE001
        raise GoogleHealthError(f"data pull failed: {type(exc).__name__}") from exc

    segments = parse_v4_sleep_segments(sleep_pts)
    vitals = parse_v4_heart_rate(hr_pts) + parse_v4_hrv(hrv_pts)
    return segments, vitals, None


def _list_v4_data_points(client, data_type: str, filter_expr: str) -> list[dict]:
    """GET /v4/users/me/dataTypes/{dataType}/dataPoints with pagination."""
    parent = f"users/me/dataTypes/{data_type}"
    out: list[dict] = []
    page_token: str | None = None
    while True:
        params: dict[str, str | int] = {"filter": filter_expr, "pageSize": 100}
        if page_token:
            params["pageToken"] = page_token
        resp = client.get(f"/{parent}/dataPoints", params=params)
        if resp.status_code >= 400:
            raise GoogleHealthError(f"list {data_type} failed: HTTP {resp.status_code}")
        body = resp.json()
        out.extend(body.get("dataPoints", []))
        page_token = body.get("nextPageToken")
        if not page_token:
            break
    return out


def _last_night_window(
    bedtime_minutes: int, wake_minutes: int, reference_now: datetime
) -> tuple[datetime, datetime]:
    """Wall-clock [start, end] of the most recently completed sleep window
    relative to ``reference_now`` (used for the live pull range)."""
    ref = reference_now
    wake_day = ref.date()
    window_end = datetime(
        wake_day.year, wake_day.month, wake_day.day, tzinfo=ref.tzinfo
    ) + timedelta(minutes=wake_minutes)
    if window_end > ref:
        window_end -= timedelta(days=1)
    duration = (wake_minutes - bedtime_minutes) % 1440
    window_start = window_end - timedelta(minutes=duration)
    return window_start, window_end
