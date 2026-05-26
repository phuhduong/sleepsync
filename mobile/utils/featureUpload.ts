/**
 * Pre-bed feature payload for `POST /v1/features`.
 *
 * When Google Health is connected, use `syncGoogleHealthAndUploadFeatures`.
 * Otherwise builds synthetic intervals (`source: mock`) for web/offline.
 */
import type {
  FeatureRollups,
  FeaturesPayload,
  FeatureSource,
  IntervalFeature,
  StageFractions,
} from './apiTypes';
import { getUserId } from './identity';
import { sleepWindowDurationMinutes } from './sleepWindow';

export type { FeatureSource };

const INTERVAL_MINUTES = 15;

function timezoneName(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function gauss(t: number, center: number, width: number): number {
  const k = (t - center) / width;
  return Math.exp(-0.5 * k * k);
}

/** Synthetic grid for dev, web, and offline backend work. */
export function buildMockIntervals(intervalCount: number): IntervalFeature[] {
  const spike = 0.62;
  return Array.from({ length: intervalCount }, (_, i) => {
    const tStart = i / intervalCount;
    const tEnd = (i + 1) / intervalCount;
    const mid = 0.5 * (tStart + tEnd);
    const awake = Math.min(0.85, 0.07 + 0.5 * gauss(mid, spike, 0.09));
    const deep = 0.25 * gauss(mid, 0.20, 0.18);
    const rem = 0.30 * gauss(mid, 0.80, 0.18);
    const light = Math.max(0, 1 - awake - deep - rem);
    return {
      index: i,
      tStart,
      tEnd,
      stageFractions: { awake, light, deep, rem },
      minutesAwake: awake * INTERVAL_MINUTES,
      hrvMs: 45 - 8 * gauss(mid, spike, 0.10),
      restingHr: 58 + 3 * gauss(mid, spike, 0.10),
      respiratoryRate: 14.2,
    };
  });
}

function defaultRollups(): FeatureRollups {
  return {
    sleepEfficiency7d: 0.83,
    bedtimeConsistencyMinutes: 25,
    wakeConsistencyMinutes: 18,
    sleepDebtMinutes: 60,
  };
}

/**
 * Build a client-side `FeaturesPayload` (mock until Google Health sync ships).
 * Production should prefer `syncGoogleHealthFeatures` from apiClient.
 */
export async function buildFeatureUpload(args: {
  bedtimeMinutes: number;
  wakeMinutes: number;
  now: Date;
  rollups?: FeatureRollups;
  source?: FeatureSource;
}): Promise<FeaturesPayload> {
  const userId = await getUserId();
  const windowMinutes = sleepWindowDurationMinutes(args.bedtimeMinutes, args.wakeMinutes);
  const intervalCount = Math.max(1, Math.ceil(windowMinutes / INTERVAL_MINUTES));
  const source: FeatureSource = args.source ?? 'mock';

  return {
    userId,
    timezone: timezoneName(),
    referenceNow: args.now.toISOString(),
    bedtimeMinutes: args.bedtimeMinutes,
    wakeMinutes: args.wakeMinutes,
    source,
    intervalMinutes: INTERVAL_MINUTES,
    intervals: buildMockIntervals(intervalCount),
    rollups: args.rollups ?? defaultRollups(),
  };
}

export function mergeRollups(
  base: FeatureRollups | undefined,
  extra: Partial<FeatureRollups>,
): FeatureRollups {
  return { ...(base ?? defaultRollups()), ...extra };
}
