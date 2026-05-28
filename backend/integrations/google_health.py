"""Google Health API OAuth, REST reader, and test helpers.

Live path: OAuth 2.0 + REST, window-normalized :class:`FeaturesPayload`
(``source=google_health``). :func:`synthetic_features` is for unit tests only.

The exact Google Health data-type response shape may need tweaking in
:func:`_parse_*`; those parsers are isolated so binning stays stable.
"""
from __future__ import annotations

import hashlib
import math
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.config import GoogleHealthConfig
from models.schemas import (
    FeatureRollups,
    FeaturesPayload,
    WearableOutcomeRequest,
    IntervalFeature,
    StageFractions,
)

_STAGES = ("awake", "light", "deep", "rem")
INTERVAL_MINUTES = 15


class GoogleHealthError(RuntimeError):
    """Raised when a live Google Health / OAuth call fails."""


@dataclass
class TokenBundle:
    access_token: str
    refresh_token: str
    scopes: list[str]
    expires_at: datetime


@dataclass
class SleepSegment:
    start: datetime
    end: datetime
    stage: str  # one of _STAGES


@dataclass
class VitalSample:
    at: datetime
    hr: Optional[float] = None
    hrv: Optional[float] = None
    rr: Optional[float] = None


# --------------------------------------------------------------------------- #
# OAuth                                                                        #
# --------------------------------------------------------------------------- #


def make_state() -> str:
    return secrets.token_urlsafe(24)


def authorize_url(config: GoogleHealthConfig, state: str, redirect_uri: str) -> str:
    """Google OAuth 2.0 consent URL."""
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
        # Google omits refresh_token on refresh; reuse the stored one.
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
        pass


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
    except Exception as exc:  # noqa: BLE001 — surface a clean error, never log tokens
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


# --------------------------------------------------------------------------- #
# Window helpers (match mobile sleepWindow.ts)                                 #
# --------------------------------------------------------------------------- #


def sleep_window_duration_minutes(bedtime_minutes: int, wake_minutes: int) -> int:
    bed = bedtime_minutes % 1440
    wake = wake_minutes % 1440
    if wake > bed:
        return wake - bed
    return 24 * 60 - bed + wake


def interval_count_for_window(bedtime_minutes: int, wake_minutes: int) -> int:
    return max(1, math.ceil(sleep_window_duration_minutes(bedtime_minutes, wake_minutes) / INTERVAL_MINUTES))


# --------------------------------------------------------------------------- #
# Feature pull                                                                 #
# --------------------------------------------------------------------------- #


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

    segments = _parse_v4_sleep_segments(sleep_pts)
    vitals = _parse_v4_heart_rate(hr_pts) + _parse_v4_hrv(hrv_pts)
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


def _parse_rfc3339(value: object) -> Optional[datetime]:
    if not value or not isinstance(value, str):
        return None
    try:
        normalized = value.replace("Z", "+00:00")
        return datetime.fromisoformat(normalized)
    except ValueError:
        return None


_STAGE_MAP = {
    "AWAKE": "awake",
    "LIGHT": "light",
    "DEEP": "deep",
    "REM": "rem",
    "ASLEEP": "light",
    "RESTLESS": "awake",
    "SLEEP_STAGE_TYPE_UNSPECIFIED": "light",
}


def _parse_v4_sleep_segments(data_points: list[dict]) -> list[SleepSegment]:
    segments: list[SleepSegment] = []
    for pt in data_points:
        sleep = pt.get("sleep")
        if not sleep:
            continue
        for stage in sleep.get("stages") or []:
            start = _parse_rfc3339(stage.get("startTime"))
            end = _parse_rfc3339(stage.get("endTime"))
            if start is None or end is None or end <= start:
                continue
            raw_type = stage.get("type", "LIGHT")
            mapped = _STAGE_MAP.get(raw_type, "light")
            segments.append(SleepSegment(start=start, end=end, stage=mapped))
        for oob in sleep.get("outOfBedSegments") or []:
            start = _parse_rfc3339(oob.get("startTime"))
            end = _parse_rfc3339(oob.get("endTime"))
            if start is None or end is None or end <= start:
                continue
            segments.append(SleepSegment(start=start, end=end, stage="awake"))
    return segments


def _parse_v4_heart_rate(data_points: list[dict]) -> list[VitalSample]:
    out: list[VitalSample] = []
    for pt in data_points:
        hr = pt.get("heartRate")
        if not hr:
            continue
        at = _parse_rfc3339((hr.get("sampleTime") or {}).get("physicalTime"))
        if at is None:
            continue
        bpm = hr.get("beatsPerMinute")
        try:
            val = float(bpm) if bpm is not None else None
        except (TypeError, ValueError):
            val = None
        out.append(VitalSample(at=at, hr=val))
    return out


def _parse_v4_hrv(data_points: list[dict]) -> list[VitalSample]:
    out: list[VitalSample] = []
    for pt in data_points:
        hrv = pt.get("heartRateVariability")
        if not hrv:
            continue
        at = _parse_rfc3339((hrv.get("sampleTime") or {}).get("physicalTime"))
        if at is None:
            continue
        ms = hrv.get("rootMeanSquareOfSuccessiveDifferencesMilliseconds")
        if ms is None:
            ms = hrv.get("standardDeviationMilliseconds")
        try:
            val = float(ms) if ms is not None else None
        except (TypeError, ValueError):
            val = None
        out.append(VitalSample(at=at, hrv=val))
    return out


# --------------------------------------------------------------------------- #
# Pure binning + synthetic data (unit-tested)                                  #
# --------------------------------------------------------------------------- #


def build_intervals_from_samples(
    window_start: datetime,
    window_end: datetime,
    segments: list[SleepSegment],
    vitals: list[VitalSample],
    grid_size: int,
) -> list[IntervalFeature]:
    """Bin wall-clock sleep segments + vitals into ``grid_size`` intervals over
    t ∈ [0, 1] across [window_start, window_end]. Same normalization as mobile
    ``sleepWindow.ts``: t=0 at bed, t=1 at wake."""
    total = (window_end - window_start).total_seconds()
    if total <= 0 or grid_size <= 0:
        return []

    intervals: list[IntervalFeature] = []
    for i in range(grid_size):
        t_start = i / grid_size
        t_end = (i + 1) / grid_size
        bin_start = window_start + timedelta(seconds=total * t_start)
        bin_end = window_start + timedelta(seconds=total * t_end)
        bin_secs = (bin_end - bin_start).total_seconds()

        stage_secs = {s: 0.0 for s in _STAGES}
        for seg in segments:
            overlap = _overlap_seconds(bin_start, bin_end, seg.start, seg.end)
            if overlap > 0 and seg.stage in stage_secs:
                stage_secs[seg.stage] += overlap
        covered = sum(stage_secs.values())
        if covered > 0:
            fractions = {s: stage_secs[s] / covered for s in _STAGES}
        else:
            # No coverage in this bin → treat as light sleep (neutral prior).
            fractions = {"awake": 0.0, "light": 1.0, "deep": 0.0, "rem": 0.0}
        minutes_awake = (stage_secs["awake"] / 60.0) if covered > 0 else 0.0

        hr = _mean_in_bin(vitals, bin_start, bin_end, "hr")
        hrv = _mean_in_bin(vitals, bin_start, bin_end, "hrv")
        rr = _mean_in_bin(vitals, bin_start, bin_end, "rr")

        intervals.append(
            IntervalFeature(
                index=i,
                tStart=round(t_start, 6),
                tEnd=round(t_end, 6),
                stageFractions=StageFractions(**fractions),
                minutesAwake=round(minutes_awake, 3),
                hrvMs=hrv,
                restingHr=hr,
                respiratoryRate=rr,
            )
        )
    return intervals


def _overlap_seconds(a0: datetime, a1: datetime, b0: datetime, b1: datetime) -> float:
    start = max(a0, b0)
    end = min(a1, b1)
    return max(0.0, (end - start).total_seconds())


def _mean_in_bin(
    vitals: list[VitalSample], bin_start: datetime, bin_end: datetime, attr: str
) -> Optional[float]:
    vals = [
        getattr(v, attr)
        for v in vitals
        if bin_start <= v.at < bin_end and getattr(v, attr) is not None
    ]
    if not vals:
        return None
    return round(sum(vals) / len(vals), 3)


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


def synthetic_features(
    user_id: str,
    bedtime_minutes: int,
    wake_minutes: int,
    timezone_name: str,
    reference_now: datetime,
    grid_size: int | None = None,
) -> FeaturesPayload:
    """Deterministic synthetic ``google_health`` features, seeded per user so a
    given account always 'wears' the same wake pattern in the demo. Distinct
    from the plain ``mock`` builder (the awake spike location varies by user)."""
    if grid_size is None:
        grid_size = interval_count_for_window(bedtime_minutes, wake_minutes)
    seed = int(hashlib.sha256(user_id.encode("utf-8")).hexdigest(), 16)
    # Spike center in the wake-maintenance band, varied per user across [0.55, 0.78].
    spike = 0.55 + 0.23 * ((seed % 1000) / 999.0)
    bin_minutes = sleep_window_duration_minutes(bedtime_minutes, wake_minutes) / grid_size

    intervals: list[IntervalFeature] = []
    for i in range(grid_size):
        t_start = i / grid_size
        t_end = (i + 1) / grid_size
        mid = 0.5 * (t_start + t_end)
        awake = min(0.85, 0.06 + 0.52 * _gauss(mid, spike, 0.08))
        deep = 0.25 * _gauss(mid, 0.20, 0.18)
        rem = 0.30 * _gauss(mid, 0.80, 0.18)
        light = max(0.0, 1.0 - awake - deep - rem)
        intervals.append(
            IntervalFeature(
                index=i,
                tStart=round(t_start, 6),
                tEnd=round(t_end, 6),
                stageFractions=StageFractions(awake=awake, light=light, deep=deep, rem=rem),
                minutesAwake=round(awake * bin_minutes, 3),
                hrvMs=round(45.0 - 8.0 * _gauss(mid, spike, 0.10), 3),
                restingHr=round(58.0 + 3.0 * _gauss(mid, spike, 0.10), 3),
                respiratoryRate=14.2,
            )
        )

    rollups = FeatureRollups(
        sleepEfficiency7d=round(0.78 + 0.10 * ((seed >> 10) % 100) / 100.0, 3),
        bedtimeConsistencyMinutes=22.0,
        wakeConsistencyMinutes=17.0,
        sleepDebtMinutes=75.0,
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


def _gauss(t: float, center: float, width: float) -> float:
    return math.exp(-0.5 * ((t - center) / width) ** 2)
