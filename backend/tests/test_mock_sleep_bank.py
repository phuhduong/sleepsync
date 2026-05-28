"""Shared mock sleep week fixtures."""
from __future__ import annotations

from ml.mock_sleep_bank import aggregate_mock_intervals, load_mock_week


def test_load_mock_week_has_seven_nights():
    week = load_mock_week()
    assert len(week) == 7
    assert all(n.source == "mock" for n in week)
    assert all(len(n.intervals) >= 1 for n in week)


def test_aggregate_mock_intervals_deterministic():
    a = aggregate_mock_intervals(23 * 60, 7 * 60)
    b = aggregate_mock_intervals(23 * 60, 7 * 60)
    assert a.source == "mock"
    assert len(a.intervals) == len(b.intervals)
    assert a.intervals[0].stageFractions is not None
    assert a.intervals[10].stageFractions.awake == b.intervals[10].stageFractions.awake
