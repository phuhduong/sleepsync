from __future__ import annotations

from functools import lru_cache

from fastapi import HTTPException
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.auth import get_current_user_id
from ml.risk_model import RiskModel
from models.schemas import NightRecord
from storage.app_db import AppDB

limiter = Limiter(key_func=get_remote_address)


def require_matching_user_id(header_user_id: str, body_user_id: str) -> str:
    if body_user_id != header_user_id:
        raise HTTPException(status_code=403, detail="userId does not match authenticated user")
    return header_user_id


def resolve_request_user_id(header_user_id: str, body_user_id: str | None) -> str:
    if body_user_id is None or body_user_id == "":
        return header_user_id
    return require_matching_user_id(header_user_id, body_user_id)


def require_night_for_user(
    db: AppDB, night_id: str, user_id: str
) -> NightRecord:
    night = db.get_night(night_id)
    if night is None:
        raise HTTPException(status_code=404, detail="night not found")
    if night.userId != user_id:
        raise HTTPException(status_code=403, detail="night does not belong to user")
    return night


@lru_cache(maxsize=1)
def get_risk_model() -> RiskModel:
    return RiskModel()
