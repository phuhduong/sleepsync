from __future__ import annotations

from fastapi import APIRouter, Depends

from app.auth import get_current_user_id
from models.schemas import MigrateAccountRequest, MigrateAccountResponse
from storage.app_db import AppDB
from storage.db import get_db

router = APIRouter(prefix="/v1/account", tags=["account"])


@router.post("/migrate", response_model=MigrateAccountResponse, status_code=200)
def migrate_account(
    body: MigrateAccountRequest,
    user_id: str = Depends(get_current_user_id),
    db: AppDB = Depends(get_db),
) -> MigrateAccountResponse:
    result = db.reassign_user_data(body.fromUserId, user_id)
    return MigrateAccountResponse(**result)
