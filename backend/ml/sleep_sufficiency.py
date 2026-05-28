"""Heuristic: is a binned sleep window usable for personalization?"""
from __future__ import annotations

from models.schemas import IntervalFeature


def _bin_has_staged_sleep(iv: IntervalFeature) -> bool:
    """True when the bin is not the empty-coverage light-sleep prior."""
    sf = iv.stageFractions
    if sf is None:
        return (iv.minutesAwake or 0.0) > 0.0
    awake = float(sf.awake or 0.0)
    deep = float(sf.deep or 0.0)
    rem = float(sf.rem or 0.0)
    if awake > 0.02 or deep > 0.02 or rem > 0.02:
        return True
    if (iv.minutesAwake or 0.0) > 0.5:
        return True
    # Pure light-only prior (awake=0, only light) from empty segment overlap.
    light = float(sf.light or 0.0)
    return light < 0.99 or awake > 0.0


def assess_sufficient(intervals: list[IntervalFeature]) -> bool:
    if not intervals:
        return False
    staged_bins = sum(1 for iv in intervals if _bin_has_staged_sleep(iv))
    coverage = staged_bins / len(intervals)
    if coverage < 0.40:
        return False
    minutes_awake = sum(float(iv.minutesAwake or 0.0) for iv in intervals)
    bin_mins = 15.0  # matches INTERVAL_MINUTES default grid step
    staged_minutes = 0.0
    for iv in intervals:
        sf = iv.stageFractions
        if sf is None:
            continue
        asleep_frac = float(sf.light or 0) + float(sf.deep or 0) + float(sf.rem or 0)
        staged_minutes += asleep_frac * bin_mins
    total = minutes_awake + staged_minutes
    return total >= 180.0
