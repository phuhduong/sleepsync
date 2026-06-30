import { fetchJson } from './http';
import type {
  FeaturesResponse,
  GoogleHealthAuthorizeResponse,
  GoogleHealthOutcomeSyncRequest,
  GoogleHealthStatus,
  GoogleHealthSyncRequest,
} from './apiTypes';

export function getGoogleHealthStatus(): Promise<GoogleHealthStatus> {
  return fetchJson<GoogleHealthStatus>('/v1/google-health/status', { method: 'GET' });
}

export function getGoogleHealthAuthorizeUrl(
  returnUri?: string,
): Promise<GoogleHealthAuthorizeResponse> {
  const qs = returnUri ? `?returnUri=${encodeURIComponent(returnUri)}` : '';
  return fetchJson<GoogleHealthAuthorizeResponse>(`/v1/google-health/oauth/authorize${qs}`, {
    method: 'GET',
  });
}

export function syncGoogleHealthFeatures(
  req: GoogleHealthSyncRequest,
): Promise<FeaturesResponse> {
  return fetchJson<FeaturesResponse>('/v1/google-health/sync', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function disconnectGoogleHealth(): Promise<void> {
  await fetchJson<void>('/v1/google-health/connection', {
    method: 'DELETE',
    allow204: true,
  });
}

export async function syncGoogleHealthOutcome(
  req: GoogleHealthOutcomeSyncRequest,
): Promise<void> {
  await fetchJson<void>('/v1/google-health/outcome-sync', {
    method: 'POST',
    body: JSON.stringify(req),
    allow204: true,
  });
}

export async function purgeDevBackend(): Promise<void> {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  try {
    await fetchJson<void>('/v1/dev/purge', { method: 'POST', allow204: true });
  } catch (err) {
    if (__DEV__) console.warn('[googleHealthApi] dev purge failed', err);
  }
}
