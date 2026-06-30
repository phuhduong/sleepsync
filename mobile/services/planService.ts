import { buildOfflineTonightPlan } from './devPlanFixture';
import { fetchJson } from './http';
import { storageGetItem, storageRemoveItem, storageSetItem } from './storage';
import type { PlanRequest, TonightPlan, PlanFetchSource } from '../types/plan';

const PLAN_CACHE_KEY = '@sleepsync/tonight-plan';

type CachedPlan = {
  userId: string;
  bedtimeMinutes: number;
  wakeMinutes: number;
  plan: TonightPlan;
  storedAt: string;
};

export type FetchPlanResult = {
  plan: TonightPlan;
  source: PlanFetchSource;
  error?: Error;
};

function scheduleMatches(
  cached: CachedPlan,
  bedtimeMinutes: number,
  wakeMinutes: number,
): boolean {
  return cached.bedtimeMinutes === bedtimeMinutes && cached.wakeMinutes === wakeMinutes;
}

async function cachePlan(
  userId: string,
  bedtimeMinutes: number,
  wakeMinutes: number,
  plan: TonightPlan,
): Promise<void> {
  const payload: CachedPlan = {
    userId,
    bedtimeMinutes,
    wakeMinutes,
    plan,
    storedAt: new Date().toISOString(),
  };
  await storageSetItem(PLAN_CACHE_KEY, JSON.stringify(payload));
}

export async function loadCachedPlan(
  userId: string,
  bedtimeMinutes: number,
  wakeMinutes: number,
): Promise<TonightPlan | null> {
  const raw = await storageGetItem(PLAN_CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CachedPlan;
    if (parsed.userId !== userId) return null;
    if (!scheduleMatches(parsed, bedtimeMinutes, wakeMinutes)) return null;
    return parsed.plan;
  } catch {
    return null;
  }
}

export async function clearCachedPlan(): Promise<void> {
  await storageRemoveItem(PLAN_CACHE_KEY);
}

export async function fetchTonightPlan(req: PlanRequest, now: Date): Promise<FetchPlanResult> {
  try {
    const plan = await fetchJson<TonightPlan>('/v1/tonight/plan', {
      method: 'POST',
      body: JSON.stringify(req),
    });
    await cachePlan(req.userId, req.bedtimeMinutes, req.wakeMinutes, plan);
    return { plan, source: 'network' };
  } catch (err) {
    const cached = await loadCachedPlan(req.userId, req.bedtimeMinutes, req.wakeMinutes);
    if (cached) {
      return { plan: cached, source: 'cache', error: err as Error };
    }
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[planService] plan fetch failed, using offline plan', err);
      return { plan: buildOfflineTonightPlan(now), source: 'offline', error: err as Error };
    }
    throw err;
  }
}
