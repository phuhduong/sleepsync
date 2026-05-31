"""Short-lived OAuth CSRF state (not persisted to SQLite)."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta

_OAUTH_TTL = timedelta(minutes=15)


@dataclass
class OAuthPending:
    userId: str
    """App or web URL to open after Google redirects to the backend (deep link or https)."""
    returnUri: str
    createdAt: datetime


__all__ = ["OAuthPending", "_OAUTH_TTL"]
