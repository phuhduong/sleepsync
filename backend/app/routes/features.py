"""POST /v1/features — store window-normalized sleep features (``google_health`` or ``mock``)."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Header, HTTPException

from models.schemas import FeaturesPayload, FeaturesResponse
from storage.repositories import Repository, get_repository

router = APIRouter(prefix="/v1", tags=["features"])


@router.post("/features", response_model=FeaturesResponse, status_code=200)
def upload_features(
    payload: FeaturesPayload,
    repo: Repository = Depends(get_repository),
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> FeaturesResponse:
    if x_user_id and x_user_id != payload.userId:
        raise HTTPException(status_code=400, detail="userId mismatch with X-User-Id header")
    if payload.wakeMinutes == payload.bedtimeMinutes:
        raise HTTPException(status_code=422, detail="bedtimeMinutes == wakeMinutes")

    feature_set_id = f"fs-{uuid.uuid4()}"
    repo.db.put_feature_set(feature_set_id, payload)
    return FeaturesResponse(
        featureSetId=feature_set_id,
        nightsAvailable=repo.db.feature_count_for_user(payload.userId),
    )
