import type { TonightPlan } from './apiTypes';
import { OFFLINE_PROFILE } from '../domain/profiles';
import { OFFLINE_NIGHT_ID_PREFIX } from '../types/plan';

function offlineRiskCurve(grid = 32) {
  return Array.from({ length: grid }, (_, i) => {
    const t = (i + 0.5) / grid;
    const bump = Math.exp(-0.5 * ((t - 0.65) / 0.12) ** 2);
    return { t: i / grid, p: 0.12 + 0.6 * bump, tEnd: (i + 1) / grid };
  });
}

export function buildOfflineTonightPlan(now: Date): TonightPlan {
  const nightId = `${OFFLINE_NIGHT_ID_PREFIX}${now.getTime()}`;
  return {
    nightId,
    profile: {
      ...OFFLINE_PROFILE,
      id: `generated-offline-${now.toISOString().slice(0, 10)}`,
      name: "Tonight's Plan",
    },
    riskCurve: offlineRiskCurve(),
    metadata: {
      modelVersion: 'risk-offline-opt-offline',
      coldStart: true,
      constraintsHit: ['offline_fallback'],
      generatedAt: now.toISOString(),
      nightId,
      sleepDataSource: 'mock',
      sleepDataReason: 'not_connected',
    },
  };
}
