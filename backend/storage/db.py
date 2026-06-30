"""Database engine and session factory."""
from __future__ import annotations

import os
from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine

from .app_db import AppDB

_DEFAULT_DB_PATH = "./data/sleepsync.db"


def database_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if url:
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+psycopg://", 1)
        if url.startswith("postgresql://") and "+psycopg" not in url:
            return url.replace("postgresql://", "postgresql+psycopg://", 1)
        return url
    path = os.environ.get("SLEEPSYNC_DB_PATH", _DEFAULT_DB_PATH)
    return f"sqlite:///{path}"


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    url = database_url()
    connect_args: dict[str, object] = {}
    if url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    return create_engine(url, connect_args=connect_args, pool_pre_ping=True)


@lru_cache(maxsize=1)
def get_db() -> AppDB:
    return AppDB(get_engine())
