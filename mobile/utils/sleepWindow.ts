import { clampMinutes } from './sleepSchedule';

export type SleepWindow = {
  /** Scheduled bedtime for this overnight run. */
  bedtime: Date;
  /** Scheduled wake (always after `bedtime`). */
  wake: Date;
  durationMs: number;
};

/** Length of the bed→wake window when it crosses midnight. */
export function sleepWindowDurationMinutes(
  bedtimeMinutes: number,
  wakeMinutes: number,
): number {
  const bed = clampMinutes(bedtimeMinutes);
  const wake = clampMinutes(wakeMinutes);
  if (wake > bed) {
    return wake - bed;
  }
  return 24 * 60 - bed + wake;
}

function atClockMinutesOnDay(calendarDay: Date, clockMinutes: number): Date {
  const m = clampMinutes(clockMinutes);
  const d = new Date(calendarDay);
  d.setHours(Math.floor(m / 60), m % 60, 0, 0);
  return d;
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Resolve which scheduled night `now` belongs to (for **starting** a session).
 *
 * Profile timeline uses **t = 0 at bedtime** and **t = 1 at wake** (matches keyframes/phases).
 *
 * - **Before tonight's bedtime**: if still between last bed and last wake → active window;
 *   if after this morning's wake → upcoming tonight (new apply).
 * - **Between tonight's bed and wake**: active window.
 * - **After tonight's wake**: next night.
 *
 * **Live** latches the window at mount — it must not re-resolve after wake or the run loops.
 */
export function resolveActiveSleepWindow(
  now: Date,
  bedtimeMinutes: number,
  wakeMinutes: number,
): SleepWindow {
  const bedM = clampMinutes(bedtimeMinutes);
  const wakeM = clampMinutes(wakeMinutes);
  const durationMs = sleepWindowDurationMinutes(bedM, wakeM) * 60 * 1000;

  const tonightBed = atClockMinutesOnDay(now, bedM);
  let tonightWake = atClockMinutesOnDay(now, wakeM);
  if (tonightWake.getTime() <= tonightBed.getTime()) {
    tonightWake = addDays(tonightWake, 1);
  }

  if (now.getTime() < tonightBed.getTime()) {
    const msUntilTonightBed = tonightBed.getTime() - now.getTime();
    const prevBed = addDays(tonightBed, -1);
    let prevWake = atClockMinutesOnDay(prevBed, wakeM);
    if (prevWake.getTime() <= prevBed.getTime()) {
      prevWake = addDays(prevWake, 1);
    }
    const inPrevWindow =
      now.getTime() >= prevBed.getTime() && now.getTime() < prevWake.getTime();
    // Applying for upcoming bedtime (e.g. 3:25 AM, bed 3:30 AM) — use tonight, not yesterday's run.
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

/**
 * True when apply should be blocked (between bed and wake).
 *
 * Uses **current** bed/wake schedule — not the same as `resolveActiveSleepWindow` (Live latch).
 * Before tonight's bed, yesterday's window only blocks apply if tonight's bed is still farther
 * than one sleep-window away (so moving bedtime later unlocks apply).
 */
export function isInActiveSleepWindow(
  now: Date,
  bedtimeMinutes: number,
  wakeMinutes: number,
): boolean {
  const bedM = clampMinutes(bedtimeMinutes);
  const wakeM = clampMinutes(wakeMinutes);
  const durationMs = sleepWindowDurationMinutes(bedM, wakeM) * 60 * 1000;

  let tonightBed = atClockMinutesOnDay(now, bedM);
  let tonightWake = atClockMinutesOnDay(now, wakeM);
  if (tonightWake.getTime() <= tonightBed.getTime()) {
    tonightWake = addDays(tonightWake, 1);
  }

  const t = now.getTime();

  if (t >= tonightBed.getTime() && t < tonightWake.getTime()) {
    return true;
  }

  if (t < tonightBed.getTime()) {
    const prevBed = addDays(tonightBed, -1);
    let prevWake = atClockMinutesOnDay(prevBed, wakeM);
    if (prevWake.getTime() <= prevBed.getTime()) {
      prevWake = addDays(prevWake, 1);
    }
    const inPrevWindow = t >= prevBed.getTime() && t < prevWake.getTime();
    if (!inPrevWindow) return false;
    const msUntilTonightBed = tonightBed.getTime() - t;
    return msUntilTonightBed > durationMs;
  }

  return false;
}

/** Apply is only allowed before the scheduled bedtime for the active/upcoming night. */
export function canApplyPatch(
  now: Date,
  bedtimeMinutes: number,
  wakeMinutes: number,
): boolean {
  return !isInActiveSleepWindow(now, bedtimeMinutes, wakeMinutes);
}

/** Profile parameter in [0, 1] over the scheduled bed→wake window. */
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
