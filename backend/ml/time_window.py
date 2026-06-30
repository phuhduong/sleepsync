"""Shared sleep-window time helpers."""
from __future__ import annotations

import math

INTERVAL_MINUTES = 15


def sleep_window_duration_minutes(bedtime_minutes: int, wake_minutes: int) -> int:
    bed = bedtime_minutes % 1440
    wake = wake_minutes % 1440
    if wake > bed:
        return wake - bed
    return 24 * 60 - bed + wake


def interval_count_for_window(bedtime_minutes: int, wake_minutes: int) -> int:
    return max(
        1,
        math.ceil(sleep_window_duration_minutes(bedtime_minutes, wake_minutes) / INTERVAL_MINUTES),
    )


def gauss(t: float, center: float, width: float) -> float:
    return math.exp(-0.5 * ((t - center) / width) ** 2)
