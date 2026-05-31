"""Google Health API OAuth + sync routes.

All routes are keyed by the ``X-User-Id`` header — tokens are stored per user.
See backend/README.md (Google Health OAuth + sync).
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, Response
from fastapi.responses import RedirectResponse

from app.config import AppConfig, get_config
from app.services_google_health import (
    InsufficientSleepDataError,
    GoogleHealthNotConfiguredError,
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
from models.schemas import (
    FeaturesResponse,
    GoogleHealthAuthorizeResponse,
    GoogleHealthCallbackRequest,
    GoogleHealthStatus,
    GoogleHealthOutcomeSyncRequest,
    GoogleHealthSyncRequest,
)
from storage.repositories import Repository, get_repository

router = APIRouter(prefix="/v1/google-health", tags=["google-health"])


def _require_user(x_user_id: str | None) -> str:
    if not x_user_id:
        raise HTTPException(status_code=400, detail="X-User-Id header required")
    return x_user_id


@router.get("/status", response_model=GoogleHealthStatus)
def status(
    repo: Repository = Depends(get_repository),
    config: AppConfig = Depends(get_config),
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> GoogleHealthStatus:
    return get_status(repo, config, _require_user(x_user_id))


@router.get("/oauth/authorize", response_model=GoogleHealthAuthorizeResponse)
def authorize(
    returnUri: str | None = None,  # noqa: N803 — app deep link or Expo web origin
    redirectUri: str | None = None,  # noqa: N803 — deprecated alias for returnUri
    repo: Repository = Depends(get_repository),
    config: AppConfig = Depends(get_config),
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> GoogleHealthAuthorizeResponse:
    app_return = returnUri or redirectUri
    try:
        return start_authorize(repo, config, _require_user(x_user_id), app_return)
    except GoogleHealthNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/oauth/callback")
def oauth_callback_browser(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    repo: Repository = Depends(get_repository),
    config: AppConfig = Depends(get_config),
) -> RedirectResponse:
    """Google redirects here (https). Exchange the code, then open the app."""
    ghc = config.google_health
    fallback = ghc.app_return_uri
    try:
        location = complete_callback_from_google_redirect(
            repo, config, code=code, state=state, error=error
        )
    except OAuthStateError as exc:
        location = oauth_return_url(fallback, connected=False, error=str(exc))
    except Exception:  # noqa: BLE001
        location = oauth_return_url(fallback, connected=False, error="exchange_failed")
    return RedirectResponse(url=location, status_code=302)


@router.post("/oauth/callback", response_model=GoogleHealthStatus)
def callback(
    req: GoogleHealthCallbackRequest,
    repo: Repository = Depends(get_repository),
    config: AppConfig = Depends(get_config),
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> GoogleHealthStatus:
    user_id = _require_user(x_user_id)
    try:
        return complete_callback(repo, config, user_id, req)
    except OAuthStateError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # surface token-exchange failures as 502
        raise HTTPException(status_code=502, detail=f"OAuth exchange failed: {exc}") from exc


@router.post("/sync", response_model=FeaturesResponse, status_code=200)
def sync_features(
    req: GoogleHealthSyncRequest,
    repo: Repository = Depends(get_repository),
    config: AppConfig = Depends(get_config),
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> FeaturesResponse:
    user_id = _require_user(x_user_id)
    try:
        return sync(repo, config, user_id, req)
    except NotConnectedError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except InsufficientSleepDataError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"sync failed: {exc}") from exc


@router.post("/outcome-sync", status_code=204)
def outcome_sync(
    req: GoogleHealthOutcomeSyncRequest,
    repo: Repository = Depends(get_repository),
    config: AppConfig = Depends(get_config),
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> Response:
    user_id = _require_user(x_user_id)
    try:
        sync_outcome(repo, config, user_id, req.nightId, req)
    except NotConnectedError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"outcome sync failed: {exc}") from exc
    return Response(status_code=204)


@router.delete("/connection", status_code=204)
def delete_connection(
    repo: Repository = Depends(get_repository),
    config: AppConfig = Depends(get_config),
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> Response:
    user_id = _require_user(x_user_id)
    disconnect(repo, config, user_id)
    return Response(status_code=204)
