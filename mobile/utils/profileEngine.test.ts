import { computeEngineSnapshot, evaluateProfile, interpolateDose } from './profileEngine';
import { findProfile } from './profiles';
import type { SleepWindow } from './sleepWindow';

const STANDARD = findProfile('standard');

function makeWindow(): SleepWindow {
  const bedtime = new Date(2026, 4, 1, 22, 30, 0, 0);
  const wake = new Date(2026, 4, 2, 6, 30, 0, 0);
  return { bedtime, wake, durationMs: wake.getTime() - bedtime.getTime() };
}

describe('interpolateDose', () => {
  it('returns 0 at t=0 and t=1 for standard profile', () => {
    expect(interpolateDose(STANDARD, 0)).toBe(0);
    expect(interpolateDose(STANDARD, 1)).toBe(0);
  });

  it('is monotone non-decreasing through the ramp', () => {
    const d1 = interpolateDose(STANDARD, 0.20);
    const d2 = interpolateDose(STANDARD, 0.30);
    const d3 = interpolateDose(STANDARD, 0.35);
    expect(d1).toBeLessThanOrEqual(d2);
    expect(d2).toBeLessThanOrEqual(d3);
  });

  it('clamps inputs outside [0, 1]', () => {
    expect(interpolateDose(STANDARD, -0.5)).toBe(0);
    expect(interpolateDose(STANDARD, 1.5)).toBe(0);
  });
});

describe('evaluateProfile', () => {
  it('picks the first phase at t=0', () => {
    const { phaseIdx } = evaluateProfile(STANDARD, 0);
    expect(phaseIdx).toBe(0);
  });

  it('picks the last phase at t=1', () => {
    const { phaseIdx } = evaluateProfile(STANDARD, 1);
    expect(phaseIdx).toBe(STANDARD.phases.length - 1);
  });

  it('reports phase progress in [0, 1]', () => {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const { phaseProgress } = evaluateProfile(STANDARD, t);
      expect(phaseProgress).toBeGreaterThanOrEqual(0);
      expect(phaseProgress).toBeLessThanOrEqual(1);
    }
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
  });
});
