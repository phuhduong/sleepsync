from __future__ import annotations

from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect

from storage.db import get_engine


def _alembic_config() -> Config:
    ini = Path(__file__).resolve().parent.parent / "alembic.ini"
    return Config(str(ini))


def ensure_schema_migrated() -> None:
    engine = get_engine()
    tables = set(inspect(engine).get_table_names())
    cfg = _alembic_config()

    if "feature_sets" not in tables:
        command.upgrade(cfg, "head")
        return

    from alembic.runtime.migration import MigrationContext

    with engine.connect() as conn:
        current = MigrationContext.configure(conn).get_current_revision()

    if current is None:
        command.stamp(cfg, "001")

    command.upgrade(cfg, "head")
