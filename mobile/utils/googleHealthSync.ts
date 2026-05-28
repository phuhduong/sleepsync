/**
 * Trigger a backend Google Health API pull for tonight's window.
 *
 * Uses device wall clock for the API date range (not dev time scrub).
 */
import { syncGoogleHealthFeatures } from './apiClient';
import type { FeaturesResponse } from './apiTypes';

function timezoneName(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export async function syncGoogleHealthAndUploadFeatures(args: {
  bedtimeMinutes: number;
  wakeMinutes: number;
}): Promise<FeaturesResponse> {
  return syncGoogleHealthFeatures({
    bedtimeMinutes: args.bedtimeMinutes,
    wakeMinutes: args.wakeMinutes,
    timezone: timezoneName(),
    dataNow: new Date().toISOString(),
  });
}
