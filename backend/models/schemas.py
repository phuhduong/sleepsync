"""Pydantic models; camelCase JSON matches mobile."""
from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator



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
    sleepDataSource: Literal["google_health", "mock"] = "mock"
    sleepDataReason: Literal[
        "not_connected",
        "connect_failed",
        "insufficient_data",
        "using_google",
    ] = "not_connected"



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



class PlanRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    userId: Optional[str] = None
    nightId: Optional[str] = None
    bedtimeMinutes: int = Field(..., ge=0, lt=1440)
    wakeMinutes: int = Field(..., ge=0, lt=1440)
    timezone: str
    referenceNow: datetime
    forceRegenerate: bool = False


class PlanResponse(BaseModel):
    nightId: str
    profile: Profile
    riskCurve: list[RiskPoint]
    metadata: PlanMetadata



class DebriefRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    userId: Optional[str] = None
    woke: Literal["yes", "no", "unsure"]
    groggy: int = Field(..., ge=1, le=5)
    note: Optional[str] = None
    completedAt: datetime
    profileId: str
    startedAt: datetime


class StoredDebrief(DebriefRequest):
    outcome: Optional[Literal["good", "ok"]] = None
    summary: Optional[str] = None


class DebriefResponse(BaseModel):
    outcome: Literal["good", "ok"]
    summary: str


class DeliverySample(BaseModel):
    model_config = ConfigDict(extra="ignore")

    at: datetime
    t: float = Field(..., ge=0.0, le=1.0)
    dose: float = Field(..., ge=0.0, le=1.0)
    phaseId: Optional[str] = None


class DeliveryRequest(BaseModel):
    userId: Optional[str] = None
    samples: list[DeliverySample]


class WearableOutcomeRequest(BaseModel):
    """Post-wake sleep summary (from Google Health sync or manual upload)."""

    model_config = ConfigDict(extra="ignore")

    userId: Optional[str] = None
    bedtimeMinutes: int = Field(..., ge=0, lt=1440)
    wakeMinutes: int = Field(..., ge=0, lt=1440)
    actualBedtime: Optional[datetime] = None
    actualWake: Optional[datetime] = None
    efficiency: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    minutesAwake: Optional[float] = Field(default=None, ge=0.0)
    fragmentationIndex: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    intervals: list[IntervalFeature] = Field(default_factory=list)
    verified: bool = False


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
    debrief: Optional[StoredDebrief] = None
    createdAt: datetime

    @model_validator(mode="before")
    @classmethod
    def _migrate_legacy_outcome_key(cls, data: object) -> object:
        if isinstance(data, dict) and "healthkitOutcome" in data and "wearableOutcome" not in data:
            data = dict(data)
            data["wearableOutcome"] = data.pop("healthkitOutcome")
        return data



class GoogleHealthStatus(BaseModel):
    connected: bool
    lastSyncAt: Optional[datetime] = None
    scopes: list[str] = Field(default_factory=list)


class GoogleHealthAuthorizeResponse(BaseModel):
    authorizeUrl: str
    state: str


class GoogleHealthCallbackRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    code: str
    state: Optional[str] = None
    redirectUri: Optional[str] = None


class GoogleHealthSyncRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    bedtimeMinutes: int = Field(..., ge=0, lt=1440)
    wakeMinutes: int = Field(..., ge=0, lt=1440)
    timezone: str
    referenceNow: datetime | None = None
    """Deprecated. Use ``dataNow``."""
    dataNow: datetime | None = None


class GoogleHealthOutcomeSyncRequest(GoogleHealthSyncRequest):
    nightId: str


class GoogleHealthConnection(BaseModel):
    """Internal token record (never serialized to clients). Tokens stored as Fernet ciphertext."""

    userId: str
    accessTokenEnc: str
    refreshTokenEnc: str
    scopes: list[str] = Field(default_factory=list)
    expiresAt: datetime
    connectedAt: datetime
    lastSyncAt: Optional[datetime] = None
    lastSyncReason: Optional[Literal["connect_failed", "insufficient_data"]] = None



class MockFeaturesRequest(BaseModel):
    """Optional overrides for POST /v1/dev/mock-features."""

    model_config = ConfigDict(extra="ignore")

    userId: Optional[str] = None
    bedtimeMinutes: Optional[int] = Field(default=None, ge=0, lt=1440)
    wakeMinutes: Optional[int] = Field(default=None, ge=0, lt=1440)
    scenario: Optional[Literal["early", "middle", "late"]] = None


class MigrateAccountRequest(BaseModel):
    fromUserId: str


class MigrateAccountResponse(BaseModel):
    nightsMoved: int
    featureSetsMoved: int
    connectionMoved: bool = False


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    riskModel: str
    optimizer: str
