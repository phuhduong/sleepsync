import { clampMinutes, dateAtClockMinutesOnDay } from './sleepSchedule';

export const INTERVAL_MINUTES = 15;

export type SleepWindow = {
  bedtime: Date;
  wake: Date;
  durationMs: number;
};

export function sleepWindowDurationMinutes(
  bedtimeMinutes: number,
  wakeMinutes: number,
): number {
  const bed = clampMinutes(bedtimeMinutes);
  const wake = clampMinutes(wakeMinutes);
  if (wake > bed) return wake - bed;
  return 24 * 60 - bed + wake;
}

export function intervalCountForWindow(
  bedtimeMinutes: number,
  wakeMinutes: number,
): number {
  return Math.max(
    1,
    Math.ceil(sleepWindowDurationMinutes(bedtimeMinutes, wakeMinutes) / INTERVAL_MINUTES),
  );
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function resolveBedWakeInstants(
  now: Date,
  bedtimeMinutes: number,
  wakeMinutes: number,
) {
  const bedM = clampMinutes(bedtimeMinutes);
  const wakeM = clampMinutes(wakeMinutes);
  const durationMs = sleepWindowDurationMinutes(bedM, wakeM) * 60 * 1000;
  const tonightBed = dateAtClockMinutesOnDay(now, bedM);
  let tonightWake = dateAtClockMinutesOnDay(now, wakeM);
  if (tonightWake.getTime() <= tonightBed.getTime()) {
    tonightWake = addDays(tonightWake, 1);
  }
  const prevBed = addDays(tonightBed, -1);
  let prevWake = dateAtClockMinutesOnDay(prevBed, wakeM);
  if (prevWake.getTime() <= prevBed.getTime()) {
    prevWake = addDays(prevWake, 1);
  }
  return { tonightBed, tonightWake, prevBed, prevWake, durationMs };
}


export function resolveActiveSleepWindow(
  now: Date,
  bedtimeMinutes: number,
  wakeMinutes: number,
): SleepWindow {
  const { tonightBed, tonightWake, prevBed, prevWake, durationMs } =
    resolveBedWakeInstants(now, bedtimeMinutes, wakeMinutes);

  if (now.getTime() < tonightBed.getTime()) {
    const msUntilTonightBed = tonightBed.getTime() - now.getTime();
    const inPrevWindow =
      now.getTime() >= prevBed.getTime() && now.getTime() < prevWake.getTime();
    if (inPrevWindow && msUntilTonightBed > durationMs) {
      return { bedtime: prevBed, wake: prevWake, durationMs };
    }
    return { bedtime: tonightBed, wake: tonightWake, durationMs };
  }

  if (now.getTime() >= tonightWake.getTime()) {
    return { bedtime: addDays(tonightBed, 1), wake: addDays(tonightWake, 1), durationMs };
  }

  return { bedtime: tonightBed, wake: tonightWake, durationMs };
}

export function isInActiveSleepWindow(
  now: Date,
  bedtimeMinutes: number,
  wakeMinutes: number,
): boolean {
  const { tonightBed, tonightWake, prevBed, prevWake, durationMs } =
    resolveBedWakeInstants(now, bedtimeMinutes, wakeMinutes);
  const t = now.getTime();

  if (t >= tonightBed.getTime() && t < tonightWake.getTime()) return true;

  if (t < tonightBed.getTime()) {
    const inPrevWindow = t >= prevBed.getTime() && t < prevWake.getTime();
    if (!inPrevWindow) return false;
    return tonightBed.getTime() - t > durationMs;
  }

  return false;
}

export function canApplyPatch(
  now: Date,
  bedtimeMinutes: number,
  wakeMinutes: number,
): boolean {
  return !isInActiveSleepWindow(now, bedtimeMinutes, wakeMinutes);
}

export function profileTimelineT(now: Date, window: SleepWindow): number {
  const span = window.wake.getTime() - window.bedtime.getTime();
  if (span <= 0) return 0;
  return Math.min(1, Math.max(0, (now.getTime() - window.bedtime.getTime()) / span));
}

export function isSessionComplete(now: Date, window: SleepWindow): boolean {
  return now.getTime() >= window.wake.getTime();
}

export function minutesUntilBed(now: Date, window: SleepWindow): number {
  return Math.max(0, Math.round((window.bedtime.getTime() - now.getTime()) / 60_000));
}

export function minutesSinceBed(now: Date, window: SleepWindow): number {
  return Math.max(0, Math.round((now.getTime() - window.bedtime.getTime()) / 60_000));
}

export function formatDurationMinutes(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h > 0 ? `${h}h ${r}m` : `${r}m`;
}
