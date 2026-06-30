"""SQLAlchemy table definitions (SQLite dev + Postgres production)."""
from __future__ import annotations

from sqlalchemy import Index, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class FeatureSetRow(Base):
    __tablename__ = "feature_sets"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, nullable=False)
    source: Mapped[str] = mapped_column(String, nullable=False, default="mock")
    payload_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[str] = mapped_column(String, nullable=False)

    __table_args__ = (
        Index("idx_feature_sets_user_created", "user_id", "created_at"),
        Index("idx_feature_sets_user_source", "user_id", "source"),
    )


class NightRow(Base):
    __tablename__ = "nights"

    night_id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, nullable=False)
    payload_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[str] = mapped_column(String, nullable=False)

    __table_args__ = (
        Index("idx_nights_user_created", "user_id", "created_at"),
    )


class GhConnectionRow(Base):
    __tablename__ = "gh_connections"

    user_id: Mapped[str] = mapped_column(String, primary_key=True)
    payload_json: Mapped[str] = mapped_column(Text, nullable=False)


class OAuthPendingRow(Base):
    __tablename__ = "oauth_pending"

    state: Mapped[str] = mapped_column(String, primary_key=True)
    payload_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[str] = mapped_column(String, nullable=False)

    __table_args__ = (
        Index("idx_oauth_pending_created", "created_at"),
    )
