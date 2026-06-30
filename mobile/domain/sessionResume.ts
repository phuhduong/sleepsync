import type { PendingSession } from './profiles';
import { isSessionComplete, resolveActiveSleepWindow } from './sleepWindow';

export function resolvePendingSessionRoute(opts: {
  now: Date;
  pendingSession: PendingSession | null;
  bedtimeMinutes: number;
  wakeMinutes: number;
}): '/live' | '/debrief' | null {
  const { now, pendingSession, bedtimeMinutes, wakeMinutes } = opts;
  if (!pendingSession) return null;

  const startedAt = new Date(pendingSession.startedAt);
  if (Number.isNaN(startedAt.getTime())) return null;

  const window = resolveActiveSleepWindow(startedAt, bedtimeMinutes, wakeMinutes);
  return isSessionComplete(now, window) ? '/debrief' : '/live';
}
