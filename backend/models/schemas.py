"""Pydantic request/response models (OpenAPI at /docs).

Field names use camelCase to match the JSON contract directly so mobile
can consume them without remapping.
"""
from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


# ---------- Shared profile types (must match mobile/utils/profiles.ts) ----------


class Keyframe(BaseModel):
    model_config = ConfigDict(extra="ignore")

    t: float = Field(..., ge=0.0, le=1.0)
    dose: float = Field(..., ge=0.0, le=1.0)
    label: Optional[str] = None


class Phase(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    duration: float = Field(..., ge=0.0, le=1.0)
    dose: float = Field(..., ge=0.0, le=1.0)


class Profile(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    recommended: bool = True
    rationale: str
    keyframes: list[Keyframe]
    phases: list[Phase]


# ---------- Risk + metadata ----------


class RiskPoint(BaseModel):
    t: float = Field(..., ge=0.0, le=1.0)
    p: float = Field(..., ge=0.0, le=1.0)
    tEnd: Optional[float] = Field(default=None, ge=0.0, le=1.0)


class PlanMetadata(BaseModel):
    modelVersion: str
    coldStart: bool
    constraintsHit: list[str] = Field(default_factory=list)
    generatedAt: datetime
    nightId: str


# ---------- Feature ingest ----------


class StageFractions(BaseModel):
    model_config = ConfigDict(extra="ignore")

    awake: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    light: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    deep: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    rem: Optional[float] = Field(default=None, ge=0.0, le=1.0)


class IntervalFeature(BaseModel):
    model_config = ConfigDict(extra="ignore")

    index: int = Field(..., ge=0)
    tStart: float = Field(..., ge=0.0, le=1.0)
    tEnd: float = Field(..., ge=0.0, le=1.0)
    stageFractions: Optional[StageFractions] = None
    minutesAwake: Optional[float] = Field(default=None, ge=0.0)
    hrvMs: Optional[float] = Field(default=None, ge=0.0)
    restingHr: Optional[float] = Field(default=None, ge=0.0)
    respiratoryRate: Optional[float] = Field(default=None, ge=0.0)


class FeatureRollups(BaseModel):
    model_config = ConfigDict(extra="ignore")

    sleepEfficiency7d: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    bedtimeConsistencyMinutes: Optional[float] = Field(default=None, ge=0.0)
    wakeConsistencyMinutes: Optional[float] = Field(default=None, ge=0.0)
    sleepDebtMinutes: Optional[float] = Field(default=None)
    lastDebriefWoke: Optional[Literal["yes", "no", "unsure"]] = None
    lastDebriefGroggy: Optional[int] = Field(default=None, ge=1, le=5)


class FeaturesPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    userId: str
    timezone: str
    referenceNow: datetime
    bedtimeMinutes: int = Field(..., ge=0, lt=1440)
    wakeMinutes: int = Field(..., ge=0, lt=1440)
    source: Literal["google_health", "mock"] = "mock"
    intervalMinutes: int = 15
    intervals: list[IntervalFeature] = Field(default_factory=list)
    rollups: Optional[FeatureRollups] = None


class FeaturesResponse(BaseModel):
    featureSetId: str
    nightsAvailable: int


# ---------- Plan ----------


class PlanRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    userId: str
    featureSetId: Optional[str] = None
    """When set, refresh plan on this night if it has no debrief yet."""
    nightId: Optional[str] = None
    bedtimeMinutes: int = Field(..., ge=0, lt=1440)
    wakeMinutes: int = Field(..., ge=0, lt=1440)
    timezone: str
    referenceNow: datetime


class PlanResponse(BaseModel):
    nightId: str
    profile: Profile
    riskCurve: list[RiskPoint]
    metadata: PlanMetadata


# ---------- Debrief / delivery / outcome ----------


class DebriefRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    userId: str
    woke: Literal["yes", "no", "unsure"]
    groggy: int = Field(..., ge=1, le=5)
    note: Optional[str] = None
    completedAt: datetime
    profileId: str
    startedAt: datetime


class DebriefResponse(BaseModel):
    sessionId: str
    outcome: Literal["good", "ok"]
    summary: str


class DeliverySample(BaseModel):
    model_config = ConfigDict(extra="ignore")

    at: datetime
    t: float = Field(..., ge=0.0, le=1.0)
    dose: float = Field(..., ge=0.0, le=1.0)
    phaseId: Optional[str] = None


class DeliveryRequest(BaseModel):
    userId: str
    samples: list[DeliverySample]


class WearableOutcomeRequest(BaseModel):
    """Post-wake sleep summary (from Google Health sync or manual upload)."""

    model_config = ConfigDict(extra="ignore")

    userId: str
    bedtimeMinutes: int = Field(..., ge=0, lt=1440)
    wakeMinutes: int = Field(..., ge=0, lt=1440)
    actualBedtime: Optional[datetime] = None
    actualWake: Optional[datetime] = None
    efficiency: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    minutesAwake: Optional[float] = Field(default=None, ge=0.0)
    fragmentationIndex: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    intervals: list[IntervalFeature] = Field(default_factory=list)


class NightRecord(BaseModel):
    nightId: str
    userId: str
    bedtimeMinutes: int
    wakeMinutes: int
    predictedRiskCurve: list[RiskPoint]
    generatedProfile: Profile
    metadata: PlanMetadata
    deliverySamples: list[DeliverySample] = Field(default_factory=list)
    wearableOutcome: Optional[WearableOutcomeRequest] = None
    debrief: Optional[DebriefRequest] = None
    createdAt: datetime

    @model_validator(mode="before")
    @classmethod
    def _migrate_legacy_outcome_key(cls, data: object) -> object:
        if isinstance(data, dict) and "healthkitOutcome" in data and "wearableOutcome" not in data:
            data = dict(data)
            data["wearableOutcome"] = data.pop("healthkitOutcome")
        return data


# ---------- Google Health API (OAuth + sync) ----------


class GoogleHealthStatus(BaseModel):
    """Connection state for the Connect Google Health UI."""

    connected: bool
    lastSyncAt: Optional[datetime] = None
    scopes: list[str] = Field(default_factory=list)
    # True when the backend is serving synthetic data (no real OAuth client).
    sandbox: bool = False


class GoogleHealthAuthorizeResponse(BaseModel):
    authorizeUrl: str
    state: str
    # When true, mobile may skip the browser and POST the callback directly.
    sandbox: bool = False


class GoogleHealthCallbackRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    code: str
    state: Optional[str] = None
    # Must match the redirect used to obtain the code; falls back to server default.
    redirectUri: Optional[str] = None


class GoogleHealthSyncRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    bedtimeMinutes: int = Field(..., ge=0, lt=1440)
    wakeMinutes: int = Field(..., ge=0, lt=1440)
    timezone: str
    referenceNow: datetime


class GoogleHealthOutcomeSyncRequest(GoogleHealthSyncRequest):
    nightId: str


class GoogleHealthConnection(BaseModel):
    """Internal token record (never serialized to clients). Refresh/access
    tokens are stored ciphertext-only via security/token_cipher.py."""

    userId: str
    accessTokenEnc: str
    refreshTokenEnc: str
    scopes: list[str] = Field(default_factory=list)
    expiresAt: datetime
    connectedAt: datetime
    lastSyncAt: Optional[datetime] = None
    sandbox: bool = False


# ---------- Dev / health ----------


class MockFeaturesRequest(BaseModel):
    """Optional overrides for POST /v1/dev/mock-features."""

    model_config = ConfigDict(extra="ignore")

    userId: Optional[str] = None
    bedtimeMinutes: Optional[int] = Field(default=None, ge=0, lt=1440)
    wakeMinutes: Optional[int] = Field(default=None, ge=0, lt=1440)
    # Optional scenario hint to skew the seeded risk shape ("early"/"middle"/"late").
    scenario: Optional[Literal["early", "middle", "late"]] = None


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    riskModel: str
    optimizer: str
