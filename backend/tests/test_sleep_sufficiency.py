"""Sleep data sufficiency heuristic."""
from __future__ import annotations

from integrations.google_health import build_intervals_from_samples, SleepSegment
from ml.sleep_sufficiency import assess_sufficient
from datetime import datetime, timedelta, timezone

from models.schemas import IntervalFeature, StageFractions


def test_empty_intervals_not_sufficient():
    assert assess_sufficient([]) is False


def test_sparse_light_only_not_sufficient():
    intervals = [
        IntervalFeature(
            index=i,
            tStart=i / 8,
            tEnd=(i + 1) / 8,
            stageFractions=StageFractions(awake=0, light=1, deep=0, rem=0),
            minutesAwake=0,
        )
        for i in range(8)
    ]
    assert assess_sufficient(intervals) is False


def test_rich_staged_sleep_is_sufficient():
    start = datetime(2026, 5, 24, 23, 0, tzinfo=timezone.utc)
    end = start + timedelta(hours=8)
    segments = [
        SleepSegment(start + timedelta(hours=i), start + timedelta(hours=i + 1), stage)
        for i, stage in enumerate(["deep", "deep", "light", "rem", "awake", "light", "deep", "rem"])
    ]
    intervals = build_intervals_from_samples(start, end, segments, [], grid_size=32)
    assert assess_sufficient(intervals) is True
