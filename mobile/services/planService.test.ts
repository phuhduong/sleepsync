import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { fetchTonightPlan } from './planService';
import type { TonightPlan } from './apiTypes';
import { isOfflineNightId, OFFLINE_NIGHT_ID_PREFIX } from '../types/plan';

describe('fetchTonightPlan', () => {
  const req = {
    userId: 'user-1',
    bedtimeMinutes: 23 * 60,
    wakeMinutes: 7 * 60,
    timezone: 'UTC',
    referenceNow: '2026-05-25T20:00:00.000Z',
  };
  const now = new Date('2026-05-25T20:00:00.000Z');

  const networkPlan: TonightPlan = {
    nightId: 'night-network',
    profile: {
      id: 'p-net',
      name: 'Network Plan',
      recommended: true,
      rationale: 'From API',
      keyframes: [{ t: 0, dose: 0 }, { t: 1, dose: 0 }],
      phases: [],
    },
    riskCurve: [{ t: 0.5, p: 0.4 }],
    metadata: {
      modelVersion: 'x',
      coldStart: false,
      constraintsHit: [],
      generatedAt: now.toISOString(),
      nightId: 'night-network',
    },
  };

  beforeEach(async () => {
    await AsyncStorage.clear();
    global.fetch = jest.fn() as typeof fetch;
  });

  it('returns network plan and caches it on success', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => networkPlan,
    });

    const result = await fetchTonightPlan(req, now);
    expect(result.source).toBe('network');
    expect(result.plan.nightId).toBe('night-network');

    (global.fetch as jest.Mock).mockRejectedValue(new Error('offline'));
    const cached = await fetchTonightPlan(req, now);
    expect(cached.source).toBe('cache');
    expect(cached.plan.nightId).toBe('night-network');
  });

  it('returns offline plan when network and cache are unavailable', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('network down'));
    const result = await fetchTonightPlan(req, now);
    expect(result.source).toBe('offline');
    expect(result.plan.nightId).toMatch(/^night-offline-/);
    expect(result.plan.metadata.constraintsHit).toContain('offline_fallback');
  });

  it('does not use cache when schedule changed', async () => {
    await AsyncStorage.setItem(
      '@sleepsync/tonight-plan',
      JSON.stringify({
        userId: 'user-1',
        bedtimeMinutes: 22 * 60,
        wakeMinutes: 6 * 60,
        plan: {
          nightId: 'night-cached',
          profile: {
            id: 'p1',
            name: 'Cached',
            recommended: true,
            rationale: '',
            keyframes: [],
            phases: [],
          },
          riskCurve: [],
          metadata: {
            modelVersion: 'x',
            coldStart: false,
            constraintsHit: [],
            generatedAt: now.toISOString(),
            nightId: 'night-cached',
          },
        },
        storedAt: now.toISOString(),
      }),
    );
    (global.fetch as jest.Mock).mockRejectedValue(new Error('network down'));
    const result = await fetchTonightPlan(req, now);
    expect(result.source).toBe('offline');
    expect(result.plan.nightId).not.toBe('night-cached');
  });

  it('isOfflineNightId recognizes offline fixture night IDs', () => {
    expect(isOfflineNightId(`${OFFLINE_NIGHT_ID_PREFIX}123`)).toBe(true);
    expect(isOfflineNightId('night-network')).toBe(false);
    expect(isOfflineNightId(null)).toBe(false);
  });
});
