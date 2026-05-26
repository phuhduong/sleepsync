jest.mock('./featureUpload', () => ({
  mergeRollups: (_base: undefined, extra: Record<string, unknown>) => ({
    sleepEfficiency7d: 0.83,
    bedtimeConsistencyMinutes: 25,
    wakeConsistencyMinutes: 18,
    sleepDebtMinutes: 60,
    ...extra,
  }),
}));

import { rollupsFromSessions } from './rollupsFromSessions';
import type { SessionRecord } from './profiles';

function session(partial: Partial<SessionRecord> & Pick<SessionRecord, 'woke' | 'groggy'>): SessionRecord {
  return {
    id: 1,
    date: 'May 1',
    profileId: 'p1',
    profile: 'Test',
    keyframes: [],
    woke: partial.woke,
    groggy: partial.groggy,
    outcome: 'ok',
    summary: '',
    completedAt: '2026-05-01T08:00:00Z',
    ...partial,
  };
}

describe('rollupsFromSessions', () => {
  it('returns undefined for empty history', () => {
    expect(rollupsFromSessions([])).toBeUndefined();
  });

  it('includes last debrief flags', () => {
    const rollups = rollupsFromSessions([
      session({ woke: 'yes', groggy: 4 }),
    ]);
    expect(rollups?.lastDebriefWoke).toBe('yes');
    expect(rollups?.lastDebriefGroggy).toBe(4);
  });

  it('computes efficiency from recent nights', () => {
    const rollups = rollupsFromSessions([
      session({ woke: 'no', groggy: 2 }),
      session({ woke: 'yes', groggy: 3 }),
    ]);
    expect(rollups?.sleepEfficiency7d).toBe(0.5);
  });
});
