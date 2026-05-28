import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  DebriefPayload,
  DeliverySample,
  FeaturesPayload,
  FeaturesResponse,
  GoogleHealthAuthorizeResponse,
  GoogleHealthOutcomeSyncRequest,
  GoogleHealthStatus,
  GoogleHealthSyncRequest,
  PlanRequest,
  TonightPlan,
} from './apiTypes';
import { buildOfflineTonightPlan } from './devPlanFixture';
import { getUserId } from './identity';

const PLAN_CACHE_KEY = '@sleepsync/tonight-plan';
const DEFAULT_BASE_URL = 'http://localhost:8000';
const REQUEST_TIMEOUT_MS = 8_000;

function baseUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL;
  return (url && url.length > 0 ? url : DEFAULT_BASE_URL).replace(/\/+$/, '');
}

async function authHeaders(): Promise<Record<string, string>> {
  const userId = await getUserId();
  return {
    'content-type': 'application/json',
    'X-User-Id': userId,
  };
}

function withTimeout(ms: number): { signal: AbortSignal; cancel: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, cancel: () => clearTimeout(timer) };
}

async function fetchJson<T>(
  path: string,
  init: RequestInit & { allow204?: boolean } = {},
): Promise<T> {
  const { allow204, headers, ...rest } = init;
  const { signal, cancel } = withTimeout(REQUEST_TIMEOUT_MS);
  try {
    const merged = { ...(await authHeaders()), ...(headers as Record<string, string> | undefined) };
    const res = await fetch(`${baseUrl()}${path}`, { ...rest, signal, headers: merged });
    if (!res.ok) {
      throw new ApiError(`HTTP ${res.status}`, res.status);
    }
    if (allow204 && res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } finally {
    cancel();
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// ---- features ----------------------------------------------------------

export function uploadFeatures(payload: FeaturesPayload): Promise<FeaturesResponse> {
  return fetchJson<FeaturesResponse>('/v1/features', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ---- Google Health API — backend/README.md ------------------------------------

/** Connection + last-sync state for the Connect Google Health UI. */
export function getGoogleHealthStatus(): Promise<GoogleHealthStatus> {
  return fetchJson<GoogleHealthStatus>('/v1/google-health/status', { method: 'GET' });
}

/** Start Google OAuth — returns the consent URL + CSRF state. */
/** @param returnUri App deep link or web URL opened after backend OAuth (not the Google redirect). */
export function getGoogleHealthAuthorizeUrl(
  returnUri?: string,
): Promise<GoogleHealthAuthorizeResponse> {
  const qs = returnUri ? `?returnUri=${encodeURIComponent(returnUri)}` : '';
  return fetchJson<GoogleHealthAuthorizeResponse>(`/v1/google-health/oauth/authorize${qs}`, {
    method: 'GET',
  });
}

/** Backend pulls Google Health API sleep/vitals and stores a feature set.
 * Throws ApiError(409) when the user is not connected — callers fall back to mock. */
export function syncGoogleHealthFeatures(
  req: GoogleHealthSyncRequest,
): Promise<FeaturesResponse> {
  return fetchJson<FeaturesResponse>('/v1/google-health/sync', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

/** Revoke + delete the stored Google Health connection (demo). */
export async function disconnectGoogleHealth(): Promise<void> {
  await fetchJson<void>('/v1/google-health/connection', {
    method: 'DELETE',
    allow204: true,
  });
}

/** Pull last night's sleep from Google Health and attach to the night record. */
export async function syncGoogleHealthOutcome(
  req: GoogleHealthOutcomeSyncRequest,
): Promise<void> {
  await fetchJson<void>('/v1/google-health/outcome-sync', {
    method: 'POST',
    body: JSON.stringify(req),
    allow204: true,
  });
}

// ---- tonight plan ------------------------------------------------------

export type FetchPlanResult = {
  plan: TonightPlan;
  source: 'network' | 'cache' | 'offline' | 'fixture';
  error?: Error;
};

export async function fetchTonightPlan(req: PlanRequest, now: Date): Promise<FetchPlanResult> {
  try {
    const plan = await fetchJson<TonightPlan>('/v1/tonight/plan', {
      method: 'POST',
      body: JSON.stringify(req),
    });
    await cachePlan(req.userId, plan);
    return { plan, source: 'network' };
  } catch (err) {
    const cached = await loadCachedPlan(req.userId);
    if (cached) {
      return { plan: cached, source: 'cache', error: err as Error };
    }
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[apiClient] plan fetch failed, using offline plan', err);
    }
    return { plan: buildOfflineTonightPlan(now), source: 'offline', error: err as Error };
  }
}

// ---- night feedback ----------------------------------------------------

export function syncDebrief(nightId: string, debrief: DebriefPayload): Promise<unknown> {
  return fetchJson<unknown>(`/v1/nights/${encodeURIComponent(nightId)}/debrief`, {
    method: 'POST',
    body: JSON.stringify(debrief),
  });
}

export async function uploadDeliverySamples(
  nightId: string,
  userId: string,
  samples: DeliverySample[],
): Promise<void> {
  if (samples.length === 0) return;
  await fetchJson<void>(`/v1/nights/${encodeURIComponent(nightId)}/delivery`, {
    method: 'POST',
    body: JSON.stringify({ userId, samples }),
    allow204: true,
  });
}

// ---- offline cache -----------------------------------------------------

type CachedPlan = { userId: string; plan: TonightPlan; storedAt: string };

async function cachePlan(userId: string, plan: TonightPlan): Promise<void> {
  try {
    const payload: CachedPlan = { userId, plan, storedAt: new Date().toISOString() };
    await AsyncStorage.setItem(PLAN_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // best-effort
  }
}

export async function loadCachedPlan(userId: string): Promise<TonightPlan | null> {
  try {
    const raw = await AsyncStorage.getItem(PLAN_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPlan;
    if (parsed.userId !== userId) return null;
    return parsed.plan;
  } catch {
    return null;
  }
}

export async function clearCachedPlan(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PLAN_CACHE_KEY);
  } catch {
    // ignore
  }
}

/** Dev only — wipe SQLite rows for the current user (nights, features, GH connection). */
export async function purgeDevBackend(): Promise<void> {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  try {
    await fetchJson<void>('/v1/dev/purge', { method: 'POST', allow204: true });
  } catch (err) {
    if (__DEV__) console.warn('[apiClient] dev purge failed', err);
  }
}

export const _internal = { baseUrl, PLAN_CACHE_KEY };
