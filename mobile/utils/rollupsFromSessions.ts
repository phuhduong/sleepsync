import type { FeatureRollups } from './apiTypes';
import { mergeRollups } from './featureUpload';
import type { SessionRecord } from './profiles';

const ROLLUP_WINDOW = 7;

/** Build feature rollups from local debrief history (newest-first sessions). */
export function rollupsFromSessions(sessions: SessionRecord[]): FeatureRollups | undefined {
  if (sessions.length === 0) return undefined;

  const last = sessions[0];
  const recent = sessions.slice(0, ROLLUP_WINDOW);
  const sleptThrough = recent.filter((s) => s.woke === 'no').length;
  const sleepEfficiency7d =
    recent.length > 0 ? sleptThrough / recent.length : undefined;

  let sleepDebtMinutes = 60;
  if (last.woke === 'yes') sleepDebtMinutes += 45;
  if (last.groggy >= 4) sleepDebtMinutes += 30;
  sleepDebtMinutes = Math.min(240, sleepDebtMinutes);

  return mergeRollups(undefined, {
    sleepEfficiency7d,
    sleepDebtMinutes,
    lastDebriefWoke: last.woke,
    lastDebriefGroggy: last.groggy,
  });
}
