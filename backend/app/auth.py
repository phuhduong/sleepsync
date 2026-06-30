from __future__ import annotations

import os
from typing import Any

import jwt
from fastapi import Header, HTTPException

from app.config import is_development


def supabase_jwt_secret() -> str | None:
    secret = os.environ.get("SUPABASE_JWT_SECRET", "").strip()
    return secret or None


def mint_test_jwt(user_id: str, secret: str) -> str:
    """HS256 token for pytest (matches Supabase-style claims)."""
    payload: dict[str, Any] = {
        "sub": user_id,
        "aud": "authenticated",
        "role": "authenticated",
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def verify_bearer_token(token: str, secret: str) -> str:
    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="invalid token") from exc
    sub = payload.get("sub")
    if not sub or not isinstance(sub, str):
        raise HTTPException(status_code=401, detail="invalid token sub")
    return sub


def get_current_user_id(
    authorization: str | None = Header(default=None, alias="Authorization"),
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> str:
    secret = supabase_jwt_secret()
    if authorization and authorization.lower().startswith("bearer "):
        if not secret:
            raise HTTPException(status_code=503, detail="auth not configured")
        return verify_bearer_token(authorization.split(" ", 1)[1].strip(), secret)
    if secret or not is_development():
        raise HTTPException(status_code=401, detail="Authorization Bearer required")
    if not x_user_id or not x_user_id.strip():
        raise HTTPException(status_code=400, detail="X-User-Id header required")
    return x_user_id.strip()
