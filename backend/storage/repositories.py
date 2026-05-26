"""Repository facade — keeps the route layer ignorant of storage backend."""
from __future__ import annotations

import os
from functools import lru_cache

from .sqlite_db import SqliteDB

_DEFAULT_DB_PATH = "./data/sleepsync.db"


class Repository:
    def __init__(self, db: SqliteDB) -> None:
        self.db = db


@lru_cache(maxsize=1)
def get_repository() -> Repository:
    path = os.environ.get("SLEEPSYNC_DB_PATH", _DEFAULT_DB_PATH)
    return Repository(SqliteDB(path))
