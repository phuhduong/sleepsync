import type { Profile, SessionWoke } from '../domain/profiles';

export const OFFLINE_NIGHT_ID_PREFIX = 'night-offline-';

export function isOfflineNightId(nightId: string | null | undefined): boolean {
  return Boolean(nightId?.startsWith(OFFLINE_NIGHT_ID_PREFIX));
}

export type PlanFetchSource = 'network' | 'cache' | 'offline';

export type RiskPoint = {
  t: number;
  p: number;
  tEnd?: number;
};

export type SleepDataSource = 'google_health' | 'mock';

export type SleepDataReason =
  | 'not_connected'
  | 'connect_failed'
  | 'insufficient_data'
  | 'using_google';

export type PlanMetadata = {
  modelVersion: string;
  coldStart: boolean;
  constraintsHit: string[];
  generatedAt: string;
  nightId: string;
  sleepDataSource?: SleepDataSource;
  sleepDataReason?: SleepDataReason;
};

export type TonightPlan = {
  nightId: string;
  profile: Profile;
  riskCurve: RiskPoint[];
  metadata: PlanMetadata;
};

export type GoogleHealthStatus = {
  connected: boolean;
  lastSyncAt?: string | null;
  scopes: string[];
};

export type DebriefResponse = {
  outcome: 'good' | 'ok';
  summary: string;
};

export type NightRecord = {
  nightId: string;
  userId: string;
  bedtimeMinutes: number;
  wakeMinutes: number;
  generatedProfile: Profile;
  debrief?: (DebriefPayload & {
    outcome: 'good' | 'ok';
    summary: string;
  }) | null;
  wearableOutcome?: { verified: boolean } | null;
  createdAt: string;
};

export type DebriefPayload = {
  userId: string;
  woke: SessionWoke;
  groggy: number;
  note?: string;
  completedAt: string;
  profileId: string;
  startedAt: string;
};
