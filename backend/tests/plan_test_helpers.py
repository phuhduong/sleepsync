"""Shared helpers for plan / personalization integration tests."""
from __future__ import annotations

from typing import Any


def user_headers(user_id: str) -> dict[str, str]:
    return {"X-User-Id": user_id}


def plan_request(
    user_id: str,
    *,
    bedtime_minutes: int = 23 * 60,
    wake_minutes: int = 7 * 60,
    timezone: str = "UTC",
    reference_now: str = "2026-05-25T20:00:00Z",
    **extra: Any,
) -> dict[str, Any]:
    """POST /v1/tonight/plan body."""
    return {
        "userId": user_id,
        "bedtimeMinutes": bedtime_minutes,
        "wakeMinutes": wake_minutes,
        "timezone": timezone,
        "referenceNow": reference_now,
        **extra,
    }


def assert_mock_plan_metadata(metadata: dict[str, Any]) -> None:
    assert metadata["sleepDataSource"] == "mock"
    assert metadata["sleepDataReason"] in (
        "not_connected",
        "insufficient_data",
        "connect_failed",
    )


def assert_google_plan_metadata(metadata: dict[str, Any]) -> None:
    assert metadata["sleepDataSource"] == "google_health"
    assert metadata["sleepDataReason"] == "using_google"


def risk_peak_p(risk_curve: list[dict[str, Any]]) -> float:
    return max(pt["p"] for pt in risk_curve)
