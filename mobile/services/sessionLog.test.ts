jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('./nightsApi', () => ({
  listRecentNights: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { listRecentNights } from './nightsApi';
import {
  clearSessions,
  loadSessions,
} from './sessionLog';
import { nightRecordToSession } from '../domain/sessionPresentation';
import type { NightRecord } from './apiTypes';

const mockListRecentNights = listRecentNights as jest.MockedFunction<typeof listRecentNights>;

describe('nightRecordToSession', () => {
  it('maps server night to history row with server summary', () => {
    const night: NightRecord = {
      nightId: 'night-abc',
      userId: 'u1',
      bedtimeMinutes: 23 * 60,
      wakeMinutes: 7 * 60,
      createdAt: '2026-05-24T22:00:00Z',
      generatedProfile: {
        id: 'gen-1',
        name: "Tonight's Plan",
        recommended: true,
        rationale: 'Tailored curve',
        keyframes: [
          { t: 0, dose: 0 },
          { t: 0.5, dose: 0.9 },
          { t: 1, dose: 0 },
        ],
        phases: [],
      },
      debrief: {
        userId: 'u1',
        woke: 'no',
        groggy: 1,
        completedAt: '2026-05-25T07:00:00Z',
        profileId: 'gen-1',
        startedAt: '2026-05-24T22:05:00Z',
        outcome: 'good',
        summary: 'Slept through. Minimal grogginess.',
      },
    };
    const session = nightRecordToSession(night);
    expect(session.id).toBe('night-abc');
    expect(session.keyframes).toEqual(night.generatedProfile.keyframes);
    expect(session.outcome).toBe('good');
    expect(session.summary).toBe('Slept through. Minimal grogginess.');
  });
});

describe('loadSessions', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockListRecentNights.mockReset();
  });

  it('loads from API and caches for offline', async () => {
    mockListRecentNights.mockResolvedValue([
      {
        nightId: 'n1',
        userId: 'u1',
        bedtimeMinutes: 1380,
        wakeMinutes: 420,
        createdAt: '2026-05-24T22:00:00Z',
        generatedProfile: {
          id: 'gen-1',
          name: 'Plan',
          recommended: true,
          rationale: '',
          keyframes: [{ t: 0, dose: 0 }, { t: 1, dose: 0 }],
          phases: [],
        },
        debrief: {
          userId: 'u1',
          woke: 'no',
          groggy: 2,
          completedAt: '2026-05-25T07:00:00Z',
          profileId: 'gen-1',
          startedAt: '2026-05-24T22:05:00Z',
          outcome: 'ok',
          summary: 'Slept through, mild grogginess on wake.',
        },
      },
    ]);
    const rows = await loadSessions();
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('n1');
    mockListRecentNights.mockRejectedValue(new Error('offline'));
    const cached = await loadSessions();
    expect(cached).toHaveLength(1);
    expect(cached[0].id).toBe('n1');
  });
});

describe('clearSessions', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockListRecentNights.mockReset();
  });

  it('clears the offline cache', async () => {
    mockListRecentNights.mockResolvedValue([
      {
        nightId: 'n1',
        userId: 'u1',
        bedtimeMinutes: 1380,
        wakeMinutes: 420,
        createdAt: '2026-05-24T22:00:00Z',
        generatedProfile: {
          id: 'gen-1',
          name: 'Plan',
          recommended: true,
          rationale: '',
          keyframes: [{ t: 0, dose: 0 }, { t: 1, dose: 0 }],
          phases: [],
        },
        debrief: {
          userId: 'u1',
          woke: 'no',
          groggy: 2,
          completedAt: '2026-05-25T07:00:00Z',
          profileId: 'gen-1',
          startedAt: '2026-05-24T22:05:00Z',
          outcome: 'ok',
          summary: 'Slept through, mild grogginess on wake.',
        },
      },
    ]);
    await loadSessions();
    await clearSessions();
    mockListRecentNights.mockRejectedValue(new Error('offline'));
    expect(await loadSessions()).toEqual([]);
  });
});
