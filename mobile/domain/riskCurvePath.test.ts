import { riskPointsToKeyframes } from './riskCurvePath';

const BUMP = [
  { t: 0, p: 0.1 },
  { t: 0.5, p: 0.2 },
  { t: 0.65, p: 0.8 },
  { t: 0.8, p: 0.3 },
  { t: 1, p: 0.1 },
];

describe('riskPointsToKeyframes', () => {
  it('samples risk into keyframes', () => {
    const kf = riskPointsToKeyframes(BUMP, 12);
    expect(kf.length).toBe(12);
    expect(kf[0]?.dose).toBeCloseTo(0.1, 1);
    const peak = kf.reduce((best, p) => (p.dose > best.dose ? p : best), kf[0]!);
    expect(peak.dose).toBeGreaterThan(0.5);
  });
});
