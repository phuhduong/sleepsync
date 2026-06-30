from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Response

from app.deps import (
    get_current_user_id,
    require_night_for_user,
    resolve_request_user_id,
)
from app.config import is_production
from domain.debrief import derive_debrief_outcome
from models.schemas import (
    DebriefRequest,
    DebriefResponse,
    DeliveryRequest,
    NightRecord,
    WearableOutcomeRequest,
)
from storage.app_db import AppDB
from storage.db import get_db

router = APIRouter(prefix="/v1/nights", tags=["nights"])


@router.get("/recent", response_model=list[NightRecord], status_code=200)
def list_recent_nights(
    limit: int = Query(50, ge=1, le=100),
    user_id: str = Depends(get_current_user_id),
    db: AppDB = Depends(get_db),
) -> list[NightRecord]:
    return db.list_debrief_nights(user_id, k=limit)


@router.post("/{night_id}/debrief", response_model=DebriefResponse, status_code=200)
def post_debrief(
    night_id: str,
    debrief: DebriefRequest,
    user_id: str = Depends(get_current_user_id),
    db: AppDB = Depends(get_db),
) -> DebriefResponse:
    resolved_user = resolve_request_user_id(user_id, debrief.userId)
    debrief = debrief.model_copy(update={"userId": resolved_user})
    require_night_for_user(db, night_id, user_id)
    night = db.attach_debrief(night_id, debrief)
    if night is None:
        raise HTTPException(status_code=404, detail="night not found")
    outcome, summary = derive_debrief_outcome(debrief)
    return DebriefResponse(outcome=outcome, summary=summary)


@router.post("/{night_id}/wearable-outcome", status_code=204)
def post_wearable_outcome(
    night_id: str,
    outcome: WearableOutcomeRequest,
    user_id: str = Depends(get_current_user_id),
    db: AppDB = Depends(get_db),
) -> Response:
    if is_production() and not outcome.verified:
        raise HTTPException(
            status_code=403,
            detail="unverified wearable outcomes are not accepted in production",
        )
    resolved_user = resolve_request_user_id(user_id, outcome.userId)
    outcome = outcome.model_copy(update={"userId": resolved_user})
    require_night_for_user(db, night_id, user_id)
    night = db.attach_outcome(night_id, outcome)
    if night is None:
        raise HTTPException(status_code=404, detail="night not found")
    return Response(status_code=204)


@router.post("/{night_id}/delivery", status_code=204)
def post_delivery(
    night_id: str,
    delivery: DeliveryRequest,
    user_id: str = Depends(get_current_user_id),
    db: AppDB = Depends(get_db),
) -> Response:
    resolved_user = resolve_request_user_id(user_id, delivery.userId)
    delivery = delivery.model_copy(update={"userId": resolved_user})
    require_night_for_user(db, night_id, user_id)
    night = db.append_delivery(night_id, delivery.samples)
    if night is None:
        raise HTTPException(status_code=404, detail="night not found")
    return Response(status_code=204)


@router.get("/{night_id}", response_model=NightRecord, status_code=200)
def get_night(
    night_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AppDB = Depends(get_db),
) -> NightRecord:
    return require_night_for_user(db, night_id, user_id)

