from __future__ import annotations

from typing import Literal

from models.schemas import DebriefRequest

Outcome = Literal["good", "ok"]


def derive_debrief_outcome(d: DebriefRequest) -> tuple[Outcome, str]:
    if d.woke == "no" and d.groggy <= 2:
        return "good", "Slept through. Minimal grogginess."
    if d.woke == "no":
        return "ok", "Slept through, mild grogginess on wake."
    if d.woke == "yes":
        return "ok", "Woke during the night."
    return "ok", "Mixed sleep — review tomorrow."
