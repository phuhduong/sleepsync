"""Google Health connect + sync orchestration.

Wires routes to ``integrations/google_health``, token encryption, and SQLite.
Refresh tokens are stored encrypted; access tokens are used only during a sync.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from integrations import google_health as gh
from models.schemas import (
    FeaturesResponse,
    GoogleHealthAuthorizeResponse,
    GoogleHealthCallbackRequest,
    GoogleHealthConnection,
    GoogleHealthStatus,
    GoogleHealthOutcomeSyncRequest,
    GoogleHealthSyncRequest,
)
from security.token_cipher import get_token_cipher
from storage.oauth import OAuthPending
from storage.repositories import Repository

from .config import AppConfig


class OAuthStateError(RuntimeError):
    """Missing or invalid OAuth state (CSRF)."""


class NotConnectedError(RuntimeError):
    """No stored Google Health connection for this user."""


def get_status(repo: Repository, config: AppConfig, user_id: str) -> GoogleHealthStatus:
    conn = repo.db.get_connection(user_id)
    if conn is None:
        return GoogleHealthStatus(
            connected=False, scopes=[], sandbox=config.google_health.sandbox
        )
    return GoogleHealthStatus(
        connected=True,
        lastSyncAt=conn.lastSyncAt,
        scopes=conn.scopes,
        sandbox=conn.sandbox,
    )


def start_authorize(
    repo: Repository,
    config: AppConfig,
    user_id: str,
    return_uri: str | None,
) -> GoogleHealthAuthorizeResponse:
    """Build the Google consent URL.

    Google always redirects to ``google_health.redirect_uri`` (https, registered
    in Cloud Console). After exchange, the GET handler sends the user to
    ``return_uri`` (app deep link or Expo web origin).
    """
    ghc = config.google_health
    app_return = return_uri or ghc.app_return_uri
    state = gh.make_state()
    repo.db.put_oauth_pending(
        state,
        OAuthPending(userId=user_id, returnUri=app_return, createdAt=datetime.now(timezone.utc)),
    )
    url = gh.authorize_url(ghc, state=state, redirect_uri=ghc.redirect_uri)
    return GoogleHealthAuthorizeResponse(authorizeUrl=url, state=state, sandbox=ghc.sandbox)


def _store_connection_from_code(
    repo: Repository, config: AppConfig, user_id: str, code: str
) -> GoogleHealthStatus:
    ghc = config.google_health
    bundle = gh.exchange_code(ghc, code=code, redirect_uri=ghc.redirect_uri)
    cipher = get_token_cipher(ghc.token_encryption_key)
    conn = GoogleHealthConnection(
        userId=user_id,
        accessTokenEnc=cipher.encrypt(bundle.access_token),
        refreshTokenEnc=cipher.encrypt(bundle.refresh_token),
        scopes=bundle.scopes,
        expiresAt=bundle.expires_at,
        connectedAt=datetime.now(timezone.utc),
        sandbox=ghc.sandbox,
    )
    repo.db.put_connection(conn)
    return get_status(repo, config, user_id)


def complete_callback(
    repo: Repository,
    config: AppConfig,
    user_id: str,
    req: GoogleHealthCallbackRequest,
) -> GoogleHealthStatus:
    if not req.state:
        raise OAuthStateError("OAuth state is required")
    pending = repo.db.pop_oauth_pending(req.state)
    if pending is None:
        raise OAuthStateError("OAuth state is invalid or expired")
    if pending.userId != user_id:
        raise OAuthStateError("OAuth state does not match user")
    return _store_connection_from_code(repo, config, user_id, req.code)


def oauth_return_url(return_uri: str, *, connected: bool, error: str | None = None) -> str:
    """Append query params to the app/web return URI (no secrets in the URL)."""
    parsed = urlparse(return_uri)
    params = dict(parse_qsl(parsed.query, keep_blank_values=True))
    if error:
        params["error"] = error
    else:
        params["connected"] = "1" if connected else "0"
    return urlunparse(parsed._replace(query=urlencode(params)))


def complete_callback_from_google_redirect(
    repo: Repository,
    config: AppConfig,
    *,
    code: str | None,
    state: str | None,
    error: str | None,
) -> str:
    """Handle Google's browser redirect to the backend; return URL for the app."""
    if not state:
        raise OAuthStateError("OAuth state is required")
    pending = repo.db.pop_oauth_pending(state)
    if pending is None:
        raise OAuthStateError("OAuth state is invalid or expired")

    if error:
        return oauth_return_url(pending.returnUri, connected=False, error=error)

    if not code:
        return oauth_return_url(pending.returnUri, connected=False, error="missing_code")

    _store_connection_from_code(repo, config, pending.userId, code)
    return oauth_return_url(pending.returnUri, connected=True)


def sync(
    repo: Repository,
    config: AppConfig,
    user_id: str,
    req: GoogleHealthSyncRequest,
) -> FeaturesResponse:
    conn = repo.db.get_connection(user_id)
    if conn is None:
        raise NotConnectedError("Google Health is not connected for this user")

    ghc = config.google_health
    cipher = get_token_cipher(ghc.token_encryption_key)
    access_token = _fresh_access_token(repo, ghc, cipher, conn)

    payload = gh.fetch_window_features(
        ghc,
        access_token=access_token,
        user_id=user_id,
        bedtime_minutes=req.bedtimeMinutes,
        wake_minutes=req.wakeMinutes,
        timezone_name=req.timezone,
        reference_now=req.referenceNow,
    )

    feature_set_id = f"fs-gh-{uuid.uuid4()}"
    repo.db.put_feature_set(feature_set_id, payload)
    repo.db.touch_connection_sync(user_id)
    return FeaturesResponse(
        featureSetId=feature_set_id,
        nightsAvailable=repo.db.feature_count_for_user(user_id),
    )


def sync_outcome(
    repo: Repository,
    config: AppConfig,
    user_id: str,
    night_id: str,
    req: GoogleHealthOutcomeSyncRequest,
) -> None:
    """Pull last night's sleep from Google Health and attach to the night record."""
    conn = repo.db.get_connection(user_id)
    if conn is None:
        raise NotConnectedError("Google Health is not connected for this user")

    ghc = config.google_health
    cipher = get_token_cipher(ghc.token_encryption_key)
    access_token = _fresh_access_token(repo, ghc, cipher, conn)

    outcome = gh.fetch_outcome(
        ghc,
        access_token=access_token,
        user_id=user_id,
        bedtime_minutes=req.bedtimeMinutes,
        wake_minutes=req.wakeMinutes,
        reference_now=req.referenceNow,
    )
    night = repo.db.attach_outcome(night_id, outcome)
    if night is None:
        raise RuntimeError(f"night not found: {night_id}")


def disconnect(repo: Repository, config: AppConfig, user_id: str) -> bool:
    conn = repo.db.get_connection(user_id)
    if conn is None:
        return False
    ghc = config.google_health
    cipher = get_token_cipher(ghc.token_encryption_key)
    try:
        gh.revoke(ghc, cipher.decrypt(conn.refreshTokenEnc))
    except Exception:  # noqa: BLE001 — revoke is best-effort; always drop locally
        pass
    return repo.db.delete_connection(user_id)


def _fresh_access_token(
    repo: Repository,
    ghc,
    cipher,
    conn: GoogleHealthConnection,
) -> str:
    """Return a valid access token, refreshing (and re-encrypting) if expired."""
    now = datetime.now(timezone.utc)
    expires = conn.expiresAt
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires > now:
        return cipher.decrypt(conn.accessTokenEnc)

    bundle = gh.refresh_access_token(ghc, cipher.decrypt(conn.refreshTokenEnc))
    conn.accessTokenEnc = cipher.encrypt(bundle.access_token)
    conn.refreshTokenEnc = cipher.encrypt(bundle.refresh_token)
    conn.expiresAt = bundle.expires_at
    conn.scopes = bundle.scopes
    repo.db.put_connection(conn)
    return bundle.access_token
