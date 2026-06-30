"""Persistence for feature sets, nights, and Google Health."""
from __future__ import annotations

import json
import threading
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Literal, Optional

from sqlalchemy import create_engine, delete, func, select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from domain.debrief import derive_debrief_outcome
from models.schemas import (
    DebriefRequest,
    DeliverySample,
    FeaturesPayload,
    GoogleHealthConnection,
    NightRecord,
    StoredDebrief,
    WearableOutcomeRequest,
)

from .orm_models import (
    Base,
    FeatureSetRow,
    GhConnectionRow,
    NightRow,
    OAuthPendingRow,
)


_OAUTH_TTL = timedelta(minutes=15)


@dataclass
class OAuthPending:
    userId: str
    returnUri: str
    createdAt: datetime


class AppDB:
    def __init__(self, engine: Engine) -> None:
        self._lock = threading.RLock()
        self._engine = engine
        self._session_factory = sessionmaker(bind=engine, expire_on_commit=False)

    def _json_dump(self, model: Any) -> str:
        if hasattr(model, "model_dump"):
            return json.dumps(model.model_dump(mode="json"))
        raise TypeError(f"expected pydantic model, got {type(model)}")

    def _load(self, cls: type, raw: str) -> Any:
        return cls.model_validate_json(raw)

    def put_feature_set(self, feature_set_id: str, payload: FeaturesPayload) -> None:
        with self._lock:
            created = datetime.now(timezone.utc).isoformat()
            with Session(self._engine) as session:
                session.merge(
                    FeatureSetRow(
                        id=feature_set_id,
                        user_id=payload.userId,
                        source=payload.source,
                        payload_json=self._json_dump(payload),
                        created_at=created,
                    )
                )
                session.commit()

    def feature_count_for_user(self, user_id: str) -> int:
        with self._lock:
            with Session(self._engine) as session:
                return int(
                    session.scalar(
                        select(func.count())
                        .select_from(FeatureSetRow)
                        .where(FeatureSetRow.user_id == user_id)
                    )
                    or 0
                )

    def google_feature_count_for_user(self, user_id: str) -> int:
        with self._lock:
            with Session(self._engine) as session:
                return int(
                    session.scalar(
                        select(func.count())
                        .select_from(FeatureSetRow)
                        .where(
                            FeatureSetRow.user_id == user_id,
                            FeatureSetRow.source == "google_health",
                        )
                    )
                    or 0
                )

    def list_recent_feature_sets(
        self, user_id: str, k: int = 7
    ) -> list[FeaturesPayload]:
        with self._lock:
            with Session(self._engine) as session:
                rows = session.scalars(
                    select(FeatureSetRow.payload_json)
                    .where(FeatureSetRow.user_id == user_id)
                    .order_by(FeatureSetRow.created_at.desc())
                    .limit(max(k * 3, k))
                ).all()
                out: list[FeaturesPayload] = []
                for raw in rows:
                    if len(out) >= k:
                        break
                    payload = self._load(FeaturesPayload, raw)
                    if payload.source == "google_health":
                        out.append(payload)
                return out

    def list_recent_debriefs(self, user_id: str, k: int = 7) -> list[DebriefRequest]:
        nights = self.list_debrief_nights(user_id, k=k)
        return [n.debrief for n in nights if n.debrief is not None]

    def list_debrief_nights(self, user_id: str, k: int = 50) -> list[NightRecord]:
        with self._lock:
            with Session(self._engine) as session:
                rows = session.scalars(
                    select(NightRow.payload_json)
                    .where(NightRow.user_id == user_id)
                    .order_by(NightRow.created_at.desc())
                    .limit(200)
                ).all()
                nights: list[tuple[datetime, NightRecord]] = []
                for raw in rows:
                    night = self._load(NightRecord, raw)
                    if night.debrief is None:
                        continue
                    nights.append((night.debrief.completedAt, night))
                nights.sort(key=lambda x: x[0], reverse=True)
                return [n for _, n in nights[:k]]

    def purge_user_data(self, user_id: str) -> None:
        with self._lock:
            with Session(self._engine) as session:
                session.execute(delete(NightRow).where(NightRow.user_id == user_id))
                session.execute(
                    delete(FeatureSetRow).where(FeatureSetRow.user_id == user_id)
                )
                session.execute(
                    delete(GhConnectionRow).where(GhConnectionRow.user_id == user_id)
                )
                session.commit()

    def reassign_user_data(self, from_user_id: str, to_user_id: str) -> dict[str, int | bool]:
        if from_user_id == to_user_id:
            return {"nightsMoved": 0, "featureSetsMoved": 0, "connectionMoved": False}

        nights_moved = 0
        feature_sets_moved = 0
        connection_moved = False

        with self._lock:
            with Session(self._engine) as session:
                for row in session.scalars(
                    select(NightRow).where(NightRow.user_id == from_user_id)
                ).all():
                    night = self._load(NightRecord, row.payload_json)
                    night.userId = to_user_id
                    row.user_id = to_user_id
                    row.payload_json = self._json_dump(night)
                    nights_moved += 1

                for row in session.scalars(
                    select(FeatureSetRow).where(FeatureSetRow.user_id == from_user_id)
                ).all():
                    payload = self._load(FeaturesPayload, row.payload_json)
                    payload.userId = to_user_id
                    row.user_id = to_user_id
                    row.payload_json = self._json_dump(payload)
                    feature_sets_moved += 1

                session.commit()

            target_conn = self.get_connection(to_user_id)
            source_conn = self.get_connection(from_user_id)
            if source_conn is not None:
                if target_conn is None:
                    source_conn.userId = to_user_id
                    self.put_connection(source_conn)
                    connection_moved = True
                self.delete_connection(from_user_id)

        return {
            "nightsMoved": nights_moved,
            "featureSetsMoved": feature_sets_moved,
            "connectionMoved": connection_moved,
        }

    def put_night(self, record: NightRecord) -> None:
        with self._lock:
            created = record.createdAt.isoformat()
            with Session(self._engine) as session:
                session.merge(
                    NightRow(
                        night_id=record.nightId,
                        user_id=record.userId,
                        payload_json=self._json_dump(record),
                        created_at=created,
                    )
                )
                session.commit()

    def get_night(self, night_id: str) -> Optional[NightRecord]:
        with self._lock:
            with Session(self._engine) as session:
                raw = session.scalar(
                    select(NightRow.payload_json).where(NightRow.night_id == night_id)
                )
                if raw is None:
                    return None
                return self._load(NightRecord, raw)

    def find_open_night_for_user(
        self, user_id: str, bedtime_minutes: int, wake_minutes: int
    ) -> Optional[NightRecord]:
        with self._lock:
            with Session(self._engine) as session:
                rows = session.scalars(
                    select(NightRow.payload_json)
                    .where(NightRow.user_id == user_id)
                    .order_by(NightRow.created_at.desc())
                    .limit(30)
                ).all()
                for raw in rows:
                    night = self._load(NightRecord, raw)
                    if night.debrief is not None:
                        continue
                    if (
                        night.bedtimeMinutes == bedtime_minutes
                        and night.wakeMinutes == wake_minutes
                    ):
                        return night
                return None

    def attach_debrief(self, night_id: str, debrief: DebriefRequest) -> Optional[NightRecord]:
        with self._lock:
            night = self.get_night(night_id)
            if night is None:
                return None
            outcome, summary = derive_debrief_outcome(debrief)
            night.debrief = StoredDebrief(
                **debrief.model_dump(),
                outcome=outcome,
                summary=summary,
            )
            self.put_night(night)
            return night

    def attach_outcome(
        self, night_id: str, outcome: WearableOutcomeRequest
    ) -> Optional[NightRecord]:
        with self._lock:
            night = self.get_night(night_id)
            if night is None:
                return None
            night.wearableOutcome = outcome
            self.put_night(night)
            return night

    def append_delivery(
        self, night_id: str, samples: list[DeliverySample]
    ) -> Optional[NightRecord]:
        with self._lock:
            night = self.get_night(night_id)
            if night is None:
                return None
            night.deliverySamples.extend(samples)
            self.put_night(night)
            return night

    def put_connection(self, conn: GoogleHealthConnection) -> None:
        with self._lock:
            with Session(self._engine) as session:
                session.merge(
                    GhConnectionRow(
                        user_id=conn.userId,
                        payload_json=self._json_dump(conn),
                    )
                )
                session.commit()

    def get_connection(self, user_id: str) -> Optional[GoogleHealthConnection]:
        with self._lock:
            with Session(self._engine) as session:
                raw = session.scalar(
                    select(GhConnectionRow.payload_json).where(
                        GhConnectionRow.user_id == user_id
                    )
                )
                if raw is None:
                    return None
                return self._load(GoogleHealthConnection, raw)

    def delete_connection(self, user_id: str) -> bool:
        with self._lock:
            with Session(self._engine) as session:
                result = session.execute(
                    delete(GhConnectionRow).where(GhConnectionRow.user_id == user_id)
                )
                session.commit()
                return result.rowcount > 0

    def touch_connection_sync(self, user_id: str) -> None:
        with self._lock:
            conn = self.get_connection(user_id)
            if conn is not None:
                conn.lastSyncAt = datetime.now(timezone.utc)
                conn.lastSyncReason = None
                self.put_connection(conn)

    def record_sync_reason(
        self,
        user_id: str,
        reason: Literal["connect_failed", "insufficient_data"],
    ) -> None:
        with self._lock:
            conn = self.get_connection(user_id)
            if conn is not None:
                conn.lastSyncReason = reason
                self.put_connection(conn)

    def _oauth_dump(self, pending: OAuthPending) -> str:
        return json.dumps(
            {
                "userId": pending.userId,
                "returnUri": pending.returnUri,
                "createdAt": pending.createdAt.isoformat(),
            }
        )

    def _oauth_load(self, raw: str) -> OAuthPending:
        data = json.loads(raw)
        created = data["createdAt"]
        if isinstance(created, str) and created.endswith("Z"):
            created = created[:-1] + "+00:00"
        return OAuthPending(
            userId=data["userId"],
            returnUri=data["returnUri"],
            createdAt=datetime.fromisoformat(created),
        )

    def put_oauth_pending(self, state: str, pending: OAuthPending) -> None:
        with self._lock:
            self._purge_expired_oauth_locked()
            with Session(self._engine) as session:
                session.merge(
                    OAuthPendingRow(
                        state=state,
                        payload_json=self._oauth_dump(pending),
                        created_at=pending.createdAt.isoformat(),
                    )
                )
                session.commit()

    def pop_oauth_pending(self, state: str) -> Optional[OAuthPending]:
        with self._lock:
            self._purge_expired_oauth_locked()
            with Session(self._engine) as session:
                raw = session.scalar(
                    select(OAuthPendingRow.payload_json).where(
                        OAuthPendingRow.state == state
                    )
                )
                if raw is None:
                    return None
                session.execute(
                    delete(OAuthPendingRow).where(OAuthPendingRow.state == state)
                )
                session.commit()
                return self._oauth_load(raw)

    def _purge_expired_oauth_locked(self) -> None:
        now = datetime.now(timezone.utc)
        with Session(self._engine) as session:
            rows = session.execute(
                select(OAuthPendingRow.state, OAuthPendingRow.payload_json)
            ).all()
            expired_states: list[str] = []
            for state, raw in rows:
                pending = self._oauth_load(raw)
                if now - pending.createdAt > _OAUTH_TTL:
                    expired_states.append(state)
            if not expired_states:
                return
            for state in expired_states:
                session.execute(
                    delete(OAuthPendingRow).where(OAuthPendingRow.state == state)
                )
            session.commit()
