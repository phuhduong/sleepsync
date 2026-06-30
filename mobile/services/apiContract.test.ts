import * as fs from 'fs';
import * as path from 'path';
import type { Profile } from '../domain/profiles';
import type { TonightPlan } from '../types/plan';

const planGolden = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '..', '..', 'shared', 'contracts', 'plan_response.golden.json'),
    'utf8',
  ),
) as TonightPlan;

const PROFILE_KEYS: (keyof Profile)[] = [
  'id',
  'name',
  'recommended',
  'rationale',
  'keyframes',
  'phases',
];

describe('plan response contract', () => {
  it('shared golden matches TonightPlan contract', () => {
    expect(planGolden.metadata.nightId).toBe(planGolden.nightId);

    const keyframeTs = planGolden.profile.keyframes.map((kf) => kf.t);
    expect(keyframeTs).toEqual([...keyframeTs].sort((a, b) => a - b));
    expect(planGolden.profile.keyframes[0]).toMatchObject({ t: 0, dose: 0 });
    expect(planGolden.profile.keyframes.at(-1)).toMatchObject({ t: 1, dose: 0 });

    for (const kf of planGolden.profile.keyframes) {
      expect(kf.dose).toBeGreaterThanOrEqual(0);
      expect(kf.dose).toBeLessThanOrEqual(1);
      expect(kf).toHaveProperty('t');
      expect(kf).toHaveProperty('dose');
    }
    for (const point of planGolden.riskCurve) {
      expect(point.p).toBeGreaterThanOrEqual(0);
      expect(point.p).toBeLessThanOrEqual(1);
    }
    for (const key of PROFILE_KEYS) {
      expect(planGolden.profile).toHaveProperty(key);
    }
    for (const phase of planGolden.profile.phases) {
      for (const key of ['id', 'name', 'duration', 'dose'] as const) {
        expect(phase).toHaveProperty(key);
      }
    }

    expect(planGolden).toMatchObject({
      nightId: 'night-contract-golden',
      profile: {
        id: 'generated-contract',
        name: "Tonight's Plan",
        recommended: true,
        phases: expect.arrayContaining([
          expect.objectContaining({ id: 'delayed' }),
          expect.objectContaining({ id: 'taper' }),
        ]),
      },
      metadata: {
        modelVersion: 'heuristic-v0-opt-0.1.0',
        coldStart: true,
        constraintsHit: ['cold_start'],
        sleepDataSource: 'mock',
        sleepDataReason: 'not_connected',
      },
    });
  });
});
