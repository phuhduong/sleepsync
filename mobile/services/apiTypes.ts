import type { Profile, SessionWoke } from '../domain/profiles';
import type {
  DebriefPayload,
  DebriefResponse,
  GoogleHealthStatus,
  NightRecord,
  PlanFetchSource,
  PlanMetadata,
  RiskPoint,
  SleepDataReason,
  SleepDataSource,
  TonightPlan,
} from '../types/plan';

export type {
  DebriefPayload,
  DebriefResponse,
  GoogleHealthStatus,
  NightRecord,
  PlanFetchSource,
  PlanMetadata,
  RiskPoint,
  SleepDataReason,
  SleepDataSource,
  TonightPlan,
  Profile,
  SessionWoke,
};

export type FeaturesResponse = {
  featureSetId: string;
  nightsAvailable: number;
};

export type PlanRequest = {
  userId: string;
  nightId?: string;
  bedtimeMinutes: number;
  wakeMinutes: number;
  timezone: string;
  referenceNow: string;
  forceRegenerate?: boolean;
};

export type StoredDebrief = DebriefPayload & {
  outcome: 'good' | 'ok';
  summary: string;
};

export type DeliverySample = {
  at: string;
  t: number;
  dose: number;
  phaseId?: string;
};

export type GoogleHealthAuthorizeResponse = {
  authorizeUrl: string;
  state: string;
};

export type GoogleHealthSyncRequest = {
  bedtimeMinutes: number;
  wakeMinutes: number;
  timezone: string;
  dataNow?: string;
};

export type GoogleHealthOutcomeSyncRequest = GoogleHealthSyncRequest & {
  nightId: string;
};
