import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { fetchTonightPlan } from './apiClient';

describe('fetchTonightPlan', () => {
  const req = {
    userId: 'user-1',
    bedtimeMinutes: 23 * 60,
    wakeMinutes: 7 * 60,
    timezone: 'UTC',
    referenceNow: '2026-05-25T20:00:00.000Z',
  };
  const now = new Date('2026-05-25T20:00:00.000Z');

  beforeEach(async () => {
    await AsyncStorage.clear();
    global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as typeof fetch;
  });

  it('returns offline plan when network and cache are unavailable', async () => {
    const result = await fetchTonightPlan(req, now);
    expect(result.source).toBe('offline');
    expect(result.plan.nightId).toMatch(/^night-offline-/);
    expect(result.plan.metadata.constraintsHit).toContain('offline_fallback');
  });
});
