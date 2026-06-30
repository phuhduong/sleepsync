import { computeEngineSnapshot, evaluateProfile, interpolateDose } from './profileEngine';
import { OFFLINE_PROFILE } from './profiles';
import type { SleepWindow } from './sleepWindow';

const STANDARD = OFFLINE_PROFILE;

function makeWindow(): SleepWindow {
  const bedtime = new Date(2026, 4, 1, 22, 30, 0, 0);
  const wake = new Date(2026, 4, 2, 6, 30, 0, 0);
  return { bedtime, wake, durationMs: wake.getTime() - bedtime.getTime() };
}

describe('interpolateDose', () => {
  it('ramps from zero endpoints through the sustained band', () => {
    expect(interpolateDose(STANDARD, 0)).toBe(0);
    expect(interpolateDose(STANDARD, 1)).toBe(0);
    const rampStart = interpolateDose(STANDARD, 0.2);
    const rampMid = interpolateDose(STANDARD, 0.35);
    expect(rampStart).toBeLessThanOrEqual(rampMid);
  });
});

describe('computeEngineSnapshot', () => {
  const sleepWindow = makeWindow();

  it('flags beforeBed when now is earlier than scheduled bedtime', () => {
    const earlier = new Date(sleepWindow.bedtime.getTime() - 30 * 60 * 1000);
    const snap = computeEngineSnapshot({ profile: STANDARD, sleepWindow, now: earlier });
    expect(snap.beforeBed).toBe(true);
    expect(snap.t).toBe(0);
    expect(snap.sessionEnded).toBe(false);
  });

  it('flags sessionEnded at or after wake', () => {
    const after = new Date(sleepWindow.wake.getTime() + 60 * 1000);
    const snap = computeEngineSnapshot({ profile: STANDARD, sleepWindow, now: after });
    expect(snap.sessionEnded).toBe(true);
    expect(snap.t).toBe(1);
    expect(snap.dose).toBe(0);
  });

  it('matches manual interpolation at midpoint', () => {
    const mid = new Date(sleepWindow.bedtime.getTime() + sleepWindow.durationMs / 2);
    const snap = computeEngineSnapshot({ profile: STANDARD, sleepWindow, now: mid });
    expect(snap.t).toBeCloseTo(0.5, 5);
    expect(snap.dose).toBeCloseTo(interpolateDose(STANDARD, 0.5), 10);
    const { phaseProgress } = evaluateProfile(STANDARD, snap.t);
    expect(phaseProgress).toBeGreaterThanOrEqual(0);
    expect(phaseProgress).toBeLessThanOrEqual(1);
  });
});
