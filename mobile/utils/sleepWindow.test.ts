import {
  canApplyPatch,
  isInActiveSleepWindow,
  isSessionComplete,
  profileTimelineT,
  resolveActiveSleepWindow,
  sleepWindowDurationMinutes,
} from './sleepWindow';

function localDate(
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
): Date {
  return new Date(y, mo - 1, d, h, mi, 0, 0);
}

const BED = 22 * 60 + 30; // 10:30 PM
const WAKE = 6 * 60 + 30; // 6:30 AM

describe('sleepWindowDurationMinutes', () => {
  it('counts across midnight', () => {
    expect(sleepWindowDurationMinutes(BED, WAKE)).toBe(8 * 60);
  });
});

describe('resolveActiveSleepWindow', () => {
  it('uses upcoming window when apply is before bedtime', () => {
    const now = localDate(2026, 5, 1, 20, 30); // 8:30 PM
    const w = resolveActiveSleepWindow(now, BED, WAKE);
    expect(w.bedtime).toEqual(localDate(2026, 5, 1, 22, 30));
    expect(w.wake).toEqual(localDate(2026, 5, 2, 6, 30));
    expect(profileTimelineT(now, w)).toBe(0);
  });

  it('progresses during the window', () => {
    const bed = localDate(2026, 5, 1, 22, 30);
    const now = localDate(2026, 5, 2, 2, 30); // 4h after bed
    const w = resolveActiveSleepWindow(now, BED, WAKE);
    expect(w.bedtime).toEqual(bed);
    expect(w.wake).toEqual(localDate(2026, 5, 2, 6, 30));
    expect(profileTimelineT(now, w)).toBeCloseTo(0.5, 2);
  });

  it('ends at wake not apply+8h (8:30 PM apply → 6:30 AM wake)', () => {
    const apply = localDate(2026, 5, 1, 20, 30);
    const w = resolveActiveSleepWindow(apply, BED, WAKE);
    expect(w.wake).toEqual(localDate(2026, 5, 2, 6, 30));
    expect(profileTimelineT(w.wake, w)).toBe(1);
    const wrongEnd = new Date(apply.getTime() + 8 * 60 * 60 * 1000);
    expect(wrongEnd.getHours()).toBe(4);
    expect(wrongEnd.getMinutes()).toBe(30);
  });

  it('handles after-midnight in active window', () => {
    const now = localDate(2026, 5, 2, 2, 0);
    const w = resolveActiveSleepWindow(now, BED, WAKE);
    expect(w.bedtime).toEqual(localDate(2026, 5, 1, 22, 30));
    expect(profileTimelineT(now, w)).toBeGreaterThan(0);
  });

  it('uses next night after wake for a fresh resolve', () => {
    const now = localDate(2026, 5, 2, 8, 0);
    const w = resolveActiveSleepWindow(now, BED, WAKE);
    expect(w.bedtime).toEqual(localDate(2026, 5, 2, 22, 30));
    expect(w.wake).toEqual(localDate(2026, 5, 3, 6, 30));
    expect(profileTimelineT(now, w)).toBe(0);
  });

  it('6 AM apply is still in last night window (pre-wake), not upcoming tonight', () => {
    const now = localDate(2026, 5, 2, 6, 0);
    const w = resolveActiveSleepWindow(now, BED, WAKE);
    expect(w.bedtime).toEqual(localDate(2026, 5, 1, 22, 30));
    expect(w.wake).toEqual(localDate(2026, 5, 2, 6, 30));
    expect(profileTimelineT(now, w)).toBeGreaterThan(0.9);
  });

  it('isInActiveSleepWindow blocks apply between bed and wake', () => {
    expect(canApplyPatch(localDate(2026, 5, 1, 20, 30), BED, WAKE)).toBe(true);
    expect(isInActiveSleepWindow(localDate(2026, 5, 2, 2, 30), BED, WAKE)).toBe(true);
    expect(canApplyPatch(localDate(2026, 5, 2, 2, 30), BED, WAKE)).toBe(false);
    expect(canApplyPatch(localDate(2026, 5, 2, 7, 0), BED, WAKE)).toBe(true);
  });

  it('allows apply after moving bedtime later while still before that bed', () => {
    const now = localDate(2026, 5, 2, 2, 0); // 2 AM, was blocked with 10:30 PM bed
    const laterBed = 3 * 60 + 30; // 3:30 AM tonight
    expect(canApplyPatch(now, laterBed, WAKE)).toBe(true);
    expect(canApplyPatch(now, BED, WAKE)).toBe(false);
  });

  it('latches tonight window when applying shortly before early-morning bed', () => {
    const earlyBed = 3 * 60 + 30; // 3:30 AM
    const now = localDate(2026, 5, 2, 3, 25);
    const w = resolveActiveSleepWindow(now, earlyBed, WAKE);
    expect(w.bedtime).toEqual(localDate(2026, 5, 2, 3, 30));
    expect(w.wake).toEqual(localDate(2026, 5, 2, 6, 30));
    expect(profileTimelineT(now, w)).toBeLessThan(0.05);
    expect(isSessionComplete(localDate(2026, 5, 2, 4, 0), w)).toBe(false);
  });

  it('after wake, fresh resolve points at upcoming tonight (Live latches to avoid loop)', () => {
    const now = localDate(2026, 5, 2, 7, 0);
    const w = resolveActiveSleepWindow(now, BED, WAKE);
    expect(w.bedtime).toEqual(localDate(2026, 5, 2, 22, 30));
    expect(profileTimelineT(now, w)).toBe(0);
    const latched = resolveActiveSleepWindow(localDate(2026, 5, 1, 22, 30), BED, WAKE);
    expect(isSessionComplete(localDate(2026, 5, 2, 6, 35), latched)).toBe(true);
  });
});
