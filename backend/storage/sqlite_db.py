"""SQLite persistence for feature sets, nights, and Google Health connections."""
from __future__ import annotations

import json
import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from models.schemas import (
    DebriefRequest,
    DeliverySample,
    FeaturesPayload,
    GoogleHealthConnection,
    WearableOutcomeRequest,
    NightRecord,
)

from .oauth import OAuthPending, _OAUTH_TTL


class SqliteDB:
    def __init__(self, db_path: str) -> None:
        path = Path(db_path)
        if path.parent and str(path.parent) not in ("", "."):
            path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        self._conn = sqlite3.connect(str(path), check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._oauth_pending: dict[str, OAuthPending] = {}
        self._init_schema()

    def _init_schema(self) -> None:
        with self._lock:
            self._conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS feature_sets (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_feature_sets_user_created
                    ON feature_sets (user_id, created_at);

                CREATE TABLE IF NOT EXISTS nights (
                    night_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_nights_user_created
                    ON nights (user_id, created_at);

                CREATE TABLE IF NOT EXISTS gh_connections (
                    user_id TEXT PRIMARY KEY,
                    payload_json TEXT NOT NULL
                );
                """
            )
            self._conn.commit()

    def _json_dump(self, model: Any) -> str:
        if hasattr(model, "model_dump"):
            return json.dumps(model.model_dump(mode="json"))
        raise TypeError(f"expected pydantic model, got {type(model)}")

    def _load(self, cls: type, raw: str) -> Any:
        return cls.model_validate_json(raw)

    # features ---------------------------------------------------------------

    def put_feature_set(self, feature_set_id: str, payload: FeaturesPayload) -> None:
        with self._lock:
            created = datetime.now(timezone.utc).isoformat()
            self._conn.execute(
                """
                INSERT OR REPLACE INTO feature_sets (id, user_id, payload_json, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (feature_set_id, payload.userId, self._json_dump(payload), created),
            )
            self._conn.commit()

    def get_feature_set(self, feature_set_id: str) -> Optional[FeaturesPayload]:
        with self._lock:
            row = self._conn.execute(
                "SELECT payload_json FROM feature_sets WHERE id = ?", (feature_set_id,)
            ).fetchone()
            if row is None:
                return None
            return self._load(FeaturesPayload, row["payload_json"])

    def latest_feature_set_for_user(self, user_id: str) -> Optional[FeaturesPayload]:
        with self._lock:
            row = self._conn.execute(
                """
                SELECT payload_json FROM feature_sets
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (user_id,),
            ).fetchone()
            if row is None:
                return None
            return self._load(FeaturesPayload, row["payload_json"])

    def feature_count_for_user(self, user_id: str) -> int:
        with self._lock:
            row = self._conn.execute(
                "SELECT COUNT(*) AS c FROM feature_sets WHERE user_id = ?", (user_id,)
            ).fetchone()
            return int(row["c"]) if row else 0

    def google_feature_count_for_user(self, user_id: str) -> int:
        with self._lock:
            rows = self._conn.execute(
                "SELECT payload_json FROM feature_sets WHERE user_id = ?",
                (user_id,),
            ).fetchall()
            count = 0
            for row in rows:
                payload = self._load(FeaturesPayload, row["payload_json"])
                if payload.source == "google_health":
                    count += 1
            return count

    def list_recent_feature_sets(
        self, user_id: str, k: int = 7
    ) -> list[FeaturesPayload]:
        with self._lock:
            rows = self._conn.execute(
                """
                SELECT payload_json FROM feature_sets
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (user_id, max(k * 3, k)),
            ).fetchall()
            out: list[FeaturesPayload] = []
            for row in rows:
                if len(out) >= k:
                    break
                payload = self._load(FeaturesPayload, row["payload_json"])
                if payload.source == "google_health":
                    out.append(payload)
            return out

    def list_recent_debriefs(self, user_id: str, k: int = 7) -> list[DebriefRequest]:
        with self._lock:
            rows = self._conn.execute(
                """
                SELECT payload_json FROM nights
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT 80
                """,
                (user_id,),
            ).fetchall()
            debriefs: list[tuple[datetime, DebriefRequest]] = []
            for row in rows:
                night = self._load(NightRecord, row["payload_json"])
                if night.debrief is None:
                    continue
                debriefs.append((night.debrief.completedAt, night.debrief))
            debriefs.sort(key=lambda x: x[0], reverse=True)
            return [d for _, d in debriefs[:k]]

    def purge_user_data(self, user_id: str) -> None:
        """Dev reset — remove all persisted rows for one user."""
        with self._lock:
            self._conn.execute("DELETE FROM nights WHERE user_id = ?", (user_id,))
            self._conn.execute("DELETE FROM feature_sets WHERE user_id = ?", (user_id,))
            self._conn.execute("DELETE FROM gh_connections WHERE user_id = ?", (user_id,))
            self._conn.commit()

    # nights -----------------------------------------------------------------

    def put_night(self, record: NightRecord) -> None:
        with self._lock:
            created = record.createdAt.isoformat()
            self._conn.execute(
                """
                INSERT OR REPLACE INTO nights (night_id, user_id, payload_json, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (record.nightId, record.userId, self._json_dump(record), created),
            )
            self._conn.commit()

    def get_night(self, night_id: str) -> Optional[NightRecord]:
        with self._lock:
            row = self._conn.execute(
                "SELECT payload_json FROM nights WHERE night_id = ?", (night_id,)
            ).fetchone()
            if row is None:
                return None
            return self._load(NightRecord, row["payload_json"])

    def latest_night_for_user(self, user_id: str) -> Optional[NightRecord]:
        with self._lock:
            row = self._conn.execute(
                """
                SELECT payload_json FROM nights
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (user_id,),
            ).fetchone()
            if row is None:
                return None
            return self._load(NightRecord, row["payload_json"])

    def find_open_night_for_user(
        self, user_id: str, bedtime_minutes: int, wake_minutes: int
    ) -> Optional[NightRecord]:
        """Latest night without debrief for this schedule (reuse on plan refresh)."""
        with self._lock:
            rows = self._conn.execute(
                """
                SELECT payload_json FROM nights
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT 30
                """,
                (user_id,),
            ).fetchall()
            for row in rows:
                night = self._load(NightRecord, row["payload_json"])
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
            night.debrief = debrief
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

    # google health connections ---------------------------------------------

    def put_connection(self, conn: GoogleHealthConnection) -> None:
        with self._lock:
            self._conn.execute(
                """
                INSERT OR REPLACE INTO gh_connections (user_id, payload_json)
                VALUES (?, ?)
                """,
                (conn.userId, self._json_dump(conn)),
            )
            self._conn.commit()

    def get_connection(self, user_id: str) -> Optional[GoogleHealthConnection]:
        with self._lock:
            row = self._conn.execute(
                "SELECT payload_json FROM gh_connections WHERE user_id = ?", (user_id,)
            ).fetchone()
            if row is None:
                return None
            return self._load(GoogleHealthConnection, row["payload_json"])

    def delete_connection(self, user_id: str) -> bool:
        with self._lock:
            cur = self._conn.execute(
                "DELETE FROM gh_connections WHERE user_id = ?", (user_id,)
            )
            self._conn.commit()
            return cur.rowcount > 0

    def touch_connection_sync(self, user_id: str) -> None:
        with self._lock:
            conn = self.get_connection(user_id)
            if conn is not None:
                conn.lastSyncAt = datetime.now(timezone.utc)
                self.put_connection(conn)

    # oauth csrf state (in-memory only) --------------------------------------

    def put_oauth_pending(self, state: str, pending: OAuthPending) -> None:
        with self._lock:
            self._purge_expired_oauth_locked()
            self._oauth_pending[state] = pending

    def pop_oauth_pending(self, state: str) -> Optional[OAuthPending]:
        with self._lock:
            self._purge_expired_oauth_locked()
            return self._oauth_pending.pop(state, None)

    def _purge_expired_oauth_locked(self) -> None:
        now = datetime.now(timezone.utc)
        expired = [
            s
            for s, p in self._oauth_pending.items()
            if now - p.createdAt > _OAUTH_TTL
        ]
        for s in expired:
            del self._oauth_pending[s]
