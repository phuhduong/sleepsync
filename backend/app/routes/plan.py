from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from starlette.requests import Request

from ml.risk_model import RiskModel
from models.schemas import PlanRequest, PlanResponse
from storage.app_db import AppDB
from storage.db import get_db

from ..config import AppConfig, get_config
from ..deps import get_current_user_id, get_risk_model, resolve_request_user_id
from ..deps import limiter
from ..services import build_plan

router = APIRouter(prefix="/v1/tonight", tags=["plan"])


def _validate_window(bedtime: int, wake: int) -> None:
    duration = (wake - bedtime) % (24 * 60)
    if duration < 240:
        raise HTTPException(
            status_code=422,
            detail=f"sleep window too short ({duration} min < 240 min)",
        )


@router.post("/plan", response_model=PlanResponse, status_code=200)
@limiter.limit("30/minute")
def post_plan(
    request: Request,
    body: PlanRequest,
    user_id: str = Depends(get_current_user_id),
    db: AppDB = Depends(get_db),
    risk_model: RiskModel = Depends(get_risk_model),
    config: AppConfig = Depends(get_config),
) -> PlanResponse:
    resolved_user = resolve_request_user_id(user_id, body.userId)
    body = body.model_copy(update={"userId": resolved_user})
    _validate_window(body.bedtimeMinutes, body.wakeMinutes)
    return build_plan(db, risk_model, config, body)
