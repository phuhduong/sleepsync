"""Tonight plan endpoints — POST builds a fresh plan, GET returns last cached."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from ml.risk_model import RiskModel
from models.schemas import PlanRequest, PlanResponse
from storage.repositories import Repository, get_repository

from ..config import AppConfig, get_config
from ..deps import get_risk_model
from ..services import build_plan

router = APIRouter(prefix="/v1/tonight", tags=["plan"])


def _validate_window(bedtime: int, wake: int) -> None:
    # bed→wake duration in minutes (handles cross-midnight).
    duration = (wake - bedtime) % (24 * 60)
    if duration < 240:
        raise HTTPException(
            status_code=422,
            detail=f"sleep window too short ({duration} min < 240 min)",
        )


@router.post("/plan", response_model=PlanResponse, status_code=200)
def post_plan(
    request: PlanRequest,
    repo: Repository = Depends(get_repository),
    risk_model: RiskModel = Depends(get_risk_model),
    config: AppConfig = Depends(get_config),
) -> PlanResponse:
    _validate_window(request.bedtimeMinutes, request.wakeMinutes)
    return build_plan(repo, risk_model, config, request)


@router.get("/plan", response_model=PlanResponse, status_code=200)
def get_latest_plan(
    userId: str = Query(...),
    repo: Repository = Depends(get_repository),
    config: AppConfig = Depends(get_config),
) -> PlanResponse:
    night = repo.db.latest_night_for_user(userId)
    if night is None:
        raise HTTPException(status_code=404, detail="no plan for user")
    return PlanResponse(
        nightId=night.nightId,
        profile=night.generatedProfile,
        riskCurve=night.predictedRiskCurve,
        metadata=night.metadata,
    )
