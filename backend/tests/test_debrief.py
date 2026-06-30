"""Debrief outcome derivation."""
from __future__ import annotations

from datetime import datetime, timezone

import pytest

from domain.debrief import derive_debrief_outcome
from models.schemas import DebriefRequest


def _req(**kwargs) -> DebriefRequest:
    base = {
        "userId": "u",
        "woke": "no",
        "groggy": 2,
        "completedAt": datetime.now(timezone.utc),
        "profileId": "p",
        "startedAt": datetime.now(timezone.utc),
    }
    base.update(kwargs)
    return DebriefRequest(**base)


@pytest.mark.parametrize(
    ("woke", "groggy", "outcome", "summary_snippet"),
    [
        ("no", 2, "good", "Minimal grogginess"),
        ("no", 4, "ok", "mild grogginess"),
        ("yes", 2, "ok", "Woke during"),
        ("unsure", 3, "ok", "Mixed sleep"),
    ],
)
def test_derive_debrief_outcome(woke, groggy, outcome, summary_snippet):
    got_outcome, summary = derive_debrief_outcome(_req(woke=woke, groggy=groggy))
    assert got_outcome == outcome
    assert summary_snippet.lower() in summary.lower()
