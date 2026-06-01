"""Per-night feedback: debrief, wearable outcome, delivery log, GET record."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response

from models.schemas import (
    DebriefRequest,
    DebriefResponse,
    DeliveryRequest,
    WearableOutcomeRequest,
    NightRecord,
)
from storage.repositories import Repository, get_repository

router = APIRouter(prefix="/v1/nights", tags=["nights"])


def _require_user_id(x_user_id: str | None) -> str:
    if not x_user_id or not x_user_id.strip():
        raise HTTPException(status_code=400, detail="X-User-Id header required")
    return x_user_id.strip()


@router.get("/recent", response_model=list[NightRecord], status_code=200)
def list_recent_nights(
    limit: int = Query(50, ge=1, le=100),
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
    repo: Repository = Depends(get_repository),
) -> list[NightRecord]:
    """Debrief-complete nights for History (same store as plan personalization)."""
    user_id = _require_user_id(x_user_id)
    return repo.db.list_debrief_nights(user_id, k=limit)


@router.post("/{night_id}/debrief", response_model=DebriefResponse, status_code=200)
def post_debrief(
    night_id: str,
    debrief: DebriefRequest,
    repo: Repository = Depends(get_repository),
) -> DebriefResponse:
    night = repo.db.attach_debrief(night_id, debrief)
    if night is None:
        raise HTTPException(status_code=404, detail="night not found")
    outcome, summary = _derive_outcome(debrief)
    return DebriefResponse(sessionId=f"sess-{uuid.uuid4()}", outcome=outcome, summary=summary)


@router.post("/{night_id}/wearable-outcome", status_code=204)
def post_wearable_outcome(
    night_id: str,
    outcome: WearableOutcomeRequest,
    repo: Repository = Depends(get_repository),
) -> Response:
    night = repo.db.attach_outcome(night_id, outcome)
    if night is None:
        raise HTTPException(status_code=404, detail="night not found")
    return Response(status_code=204)


@router.post("/{night_id}/delivery", status_code=204)
def post_delivery(
    night_id: str,
    delivery: DeliveryRequest,
    repo: Repository = Depends(get_repository),
) -> Response:
    night = repo.db.append_delivery(night_id, delivery.samples)
    if night is None:
        raise HTTPException(status_code=404, detail="night not found")
    return Response(status_code=204)


@router.get("/{night_id}", response_model=NightRecord, status_code=200)
def get_night(night_id: str, repo: Repository = Depends(get_repository)) -> NightRecord:
    night = repo.db.get_night(night_id)
    if night is None:
        raise HTTPException(status_code=404, detail="night not found")
    return night


# Mirrors mobile `deriveOutcome` / `buildSessionSummary` in sessionLog.ts.
def _derive_outcome(d: DebriefRequest) -> tuple[str, str]:
    if d.woke == "no" and d.groggy <= 2:
        return "good", "Slept through. Minimal grogginess."
    if d.woke == "no":
        return "ok", "Slept through, mild grogginess on wake."
    if d.woke == "yes":
        return "ok", "Woke during the night."
    return "ok", "Mixed sleep — review tomorrow."
