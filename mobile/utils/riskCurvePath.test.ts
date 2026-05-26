import { riskAtT, riskPointsToKeyframes, sampleRiskCurve } from './riskCurvePath';
import type { RiskPoint } from './apiTypes';

const BUMP: RiskPoint[] = [
  { t: 0, p: 0.1 },
  { t: 0.5, p: 0.2 },
  { t: 0.65, p: 0.8 },
  { t: 1, p: 0.1 },
];

describe('riskCurvePath', () => {
  it('interpolates between sparse points', () => {
    expect(riskAtT(BUMP, 0.65)).toBeCloseTo(0.8);
    const mid = riskAtT(BUMP, 0.575);
    expect(mid).toBeGreaterThan(0.2);
    expect(mid).toBeLessThan(0.8);
  });

  it('resamples to a dense grid', () => {
    const sampled = sampleRiskCurve(BUMP, 80);
    expect(sampled).toHaveLength(80);
    expect(sampled[0].t).toBe(0);
    expect(sampled[79].t).toBe(1);
  });

  it('converts to keyframes for ProfileCurve', () => {
    const kf = riskPointsToKeyframes(BUMP, 12);
    expect(kf.length).toBe(12);
    expect(kf[0]).toMatchObject({ t: 0, dose: expect.any(Number) });
  });
});
