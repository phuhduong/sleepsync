import type { TonightPlan } from './apiTypes';

function buildPlan(now: Date, opts: { nightIdPrefix: string; constraintsHit: string[] }): TonightPlan {
  const nightId = `${opts.nightIdPrefix}-${now.getTime()}`;
  const grid = 32;
  const riskCurve = Array.from({ length: grid }, (_, i) => {
    const t = (i + 0.5) / grid;
    const bump = Math.exp(-0.5 * ((t - 0.65) / 0.12) ** 2);
    return { t: i / grid, p: 0.12 + 0.6 * bump, tEnd: (i + 1) / grid };
  });
  return {
    nightId,
    profile: {
      id: `generated-offline-${now.toISOString().slice(0, 10)}`,
      name: "Tonight's Plan",
      recommended: true,
      rationale:
        'Higher wake risk mid-night, with sustained release and pre-wake taper.',
      keyframes: [
        { t: 0, dose: 0 },
        { t: 0.15, dose: 0, label: 'Delayed' },
        { t: 0.35, dose: 0.85, label: 'Ramp' },
        { t: 0.78, dose: 0.85, label: 'Sustained' },
        { t: 0.93, dose: 0.1, label: 'Pre-wake' },
        { t: 1, dose: 0 },
      ],
      phases: [
        { id: 'delayed', name: 'Delayed Start', duration: 0.15, dose: 0 },
        { id: 'ramp', name: 'Ramp Up', duration: 0.2, dose: 0.85 },
        { id: 'sustained', name: 'Sustained', duration: 0.43, dose: 0.85 },
        { id: 'taper', name: 'Taper', duration: 0.15, dose: 0.45 },
        { id: 'prewake', name: 'Pre-wake', duration: 0.07, dose: 0.1 },
      ],
    },
    riskCurve,
    metadata: {
      modelVersion: 'risk-offline-opt-offline',
      coldStart: true,
      constraintsHit: opts.constraintsHit,
      generatedAt: now.toISOString(),
      nightId,
      sleepDataSource: 'mock',
      sleepDataReason: 'not_connected',
    },
  };
}

/** Used when the API is unreachable and there is no cached plan. */
export function buildOfflineTonightPlan(now: Date): TonightPlan {
  return buildPlan(now, { nightIdPrefix: 'night-offline', constraintsHit: ['offline_fallback'] });
}
