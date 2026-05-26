/**
 * After debrief, pull last night's sleep from Google Health and store on the night record.
 */
import { syncGoogleHealthOutcome } from './apiClient';

function timezoneName(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export async function syncGoogleHealthOutcomeAfterDebrief(args: {
  nightId: string;
  bedtimeMinutes: number;
  wakeMinutes: number;
  now: Date;
}): Promise<void> {
  await syncGoogleHealthOutcome({
    nightId: args.nightId,
    bedtimeMinutes: args.bedtimeMinutes,
    wakeMinutes: args.wakeMinutes,
    timezone: timezoneName(),
    referenceNow: args.now.toISOString(),
  });
}
