/**
 * Trigger a backend Google Health API pull for tonight's window.
 *
 * The backend (backend/README.md) owns OAuth + the REST pull; the
 * mobile side just asks it to sync and hand back a `featureSetId` that
 * `POST /v1/tonight/plan` can consume. Throws `ApiError(409)` when the user is
 * not connected — callers fall back to the mock feature upload.
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
  now: Date;
}): Promise<FeaturesResponse> {
  return syncGoogleHealthFeatures({
    bedtimeMinutes: args.bedtimeMinutes,
    wakeMinutes: args.wakeMinutes,
    timezone: timezoneName(),
    referenceNow: args.now.toISOString(),
  });
}
