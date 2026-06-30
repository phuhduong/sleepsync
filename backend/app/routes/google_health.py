"""Google Health OAuth + sync (JWT-scoped)."""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse

from app.config import AppConfig, get_config
from app.deps import get_current_user_id
from app.deps import limiter
from app.services_google_health import (
    GoogleHealthNotConfiguredError,
    InsufficientSleepDataError,
    NotConnectedError,
    OAuthStateError,
    complete_callback,
    complete_callback_from_google_redirect,
    disconnect,
    get_status,
    oauth_return_url,
    start_authorize,
    sync,
    sync_outcome,
)
from integrations.google_health import GoogleHealthError
from models.schemas import (
    FeaturesResponse,
    GoogleHealthAuthorizeResponse,
    GoogleHealthCallbackRequest,
    GoogleHealthOutcomeSyncRequest,
    GoogleHealthStatus,
    GoogleHealthSyncRequest,
)
from storage.app_db import AppDB
from storage.db import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/google-health", tags=["google-health"])


@router.get("/status", response_model=GoogleHealthStatus)
def status(
    db: AppDB = Depends(get_db),
    config: AppConfig = Depends(get_config),
    user_id: str = Depends(get_current_user_id),
) -> GoogleHealthStatus:
    return get_status(db, config, user_id)


@router.get("/oauth/authorize", response_model=GoogleHealthAuthorizeResponse)
@limiter.limit("20/minute")
def authorize(
    request: Request,
    returnUri: str | None = None,  # noqa: N803
    redirectUri: str | None = None,  # noqa: N803
    db: AppDB = Depends(get_db),
    config: AppConfig = Depends(get_config),
    user_id: str = Depends(get_current_user_id),
) -> GoogleHealthAuthorizeResponse:
    app_return = returnUri or redirectUri
    try:
        return start_authorize(db, config, user_id, app_return)
    except GoogleHealthNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/oauth/callback")
def oauth_callback_browser(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: AppDB = Depends(get_db),
    config: AppConfig = Depends(get_config),
) -> RedirectResponse:
    """Google redirects here (https). Exchange the code, then open the app."""
    ghc = config.google_health
    fallback = ghc.app_return_uri
    try:
        location = complete_callback_from_google_redirect(
            db, config, code=code, state=state, error=error
        )
    except OAuthStateError as exc:
        location = oauth_return_url(fallback, connected=False, error=str(exc))
    except GoogleHealthError:
        logger.exception("Google Health OAuth browser callback failed")
        location = oauth_return_url(fallback, connected=False, error="exchange_failed")
    return RedirectResponse(url=location, status_code=302)


@router.post("/oauth/callback", response_model=GoogleHealthStatus)
def callback(
    req: GoogleHealthCallbackRequest,
    db: AppDB = Depends(get_db),
    config: AppConfig = Depends(get_config),
    user_id: str = Depends(get_current_user_id),
) -> GoogleHealthStatus:
    try:
        return complete_callback(db, config, user_id, req)
    except OAuthStateError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except GoogleHealthError as exc:
        logger.exception("Google Health OAuth callback failed")
        raise HTTPException(status_code=502, detail="OAuth exchange failed") from exc


@router.post("/sync", response_model=FeaturesResponse, status_code=200)
@limiter.limit("20/minute")
def sync_features(
    request: Request,
    req: GoogleHealthSyncRequest,
    db: AppDB = Depends(get_db),
    config: AppConfig = Depends(get_config),
    user_id: str = Depends(get_current_user_id),
) -> FeaturesResponse:
    try:
        return sync(db, config, user_id, req)
    except NotConnectedError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except InsufficientSleepDataError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except GoogleHealthError as exc:
        logger.exception("Google Health sync failed")
        raise HTTPException(status_code=502, detail="sync failed") from exc


@router.post("/outcome-sync", status_code=204)
@limiter.limit("20/minute")
def outcome_sync(
    request: Request,
    req: GoogleHealthOutcomeSyncRequest,
    db: AppDB = Depends(get_db),
    config: AppConfig = Depends(get_config),
    user_id: str = Depends(get_current_user_id),
) -> Response:
    try:
        sync_outcome(db, config, user_id, req.nightId, req)
    except NotConnectedError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except GoogleHealthError as exc:
        logger.exception("Google Health outcome sync failed")
        raise HTTPException(status_code=502, detail="outcome sync failed") from exc
    return Response(status_code=204)


@router.delete("/connection", status_code=204)
def delete_connection(
    db: AppDB = Depends(get_db),
    config: AppConfig = Depends(get_config),
    user_id: str = Depends(get_current_user_id),
) -> Response:
    disconnect(db, config, user_id)
    return Response(status_code=204)
