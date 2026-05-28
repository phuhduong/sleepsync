import type { Profile, SessionWoke } from './profiles';

/** Per-interval risk probability over t ∈ [0, 1]. Matches backend schemas. */
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

export type StageFractions = {
  awake?: number;
  light?: number;
  deep?: number;
  rem?: number;
};

export type IntervalFeature = {
  index: number;
  tStart: number;
  tEnd: number;
  stageFractions?: StageFractions;
  minutesAwake?: number;
  hrvMs?: number;
  restingHr?: number;
  respiratoryRate?: number;
};

export type FeatureSource = 'google_health' | 'mock';

export type FeatureRollups = {
  sleepEfficiency7d?: number;
  bedtimeConsistencyMinutes?: number;
  wakeConsistencyMinutes?: number;
  sleepDebtMinutes?: number;
  lastDebriefWoke?: SessionWoke;
  lastDebriefGroggy?: number;
};

export type FeaturesPayload = {
  userId: string;
  timezone: string;
  referenceNow: string;
  bedtimeMinutes: number;
  wakeMinutes: number;
  source: FeatureSource;
  intervalMinutes: number;
  intervals: IntervalFeature[];
  rollups?: FeatureRollups;
};

export type FeaturesResponse = {
  featureSetId: string;
  nightsAvailable: number;
};

export type PlanRequest = {
  userId: string;
  featureSetId?: string;
  /** Reuse this server night when refreshing plan before debrief. */
  nightId?: string;
  bedtimeMinutes: number;
  wakeMinutes: number;
  timezone: string;
  referenceNow: string;
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

export type DeliverySample = {
  at: string;
  t: number;
  dose: number;
  phaseId?: string;
};

// ---- Google Health API (OAuth + sync) — backend/README.md ---------------------

/** Connection state for the Connect Google Health UI. */
export type GoogleHealthStatus = {
  connected: boolean;
  lastSyncAt?: string | null;
  scopes: string[];
};

export type GoogleHealthAuthorizeResponse = {
  authorizeUrl: string;
  state: string;
};

export type GoogleHealthSyncRequest = {
  bedtimeMinutes: number;
  wakeMinutes: number;
  timezone: string;
  referenceNow?: string;
  dataNow?: string;
};

export type GoogleHealthOutcomeSyncRequest = GoogleHealthSyncRequest & {
  nightId: string;
};
