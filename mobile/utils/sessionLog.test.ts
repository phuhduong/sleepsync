jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { appendSession, buildSessionSummary, clearSessions, deriveOutcome, loadSessions } from './sessionLog';

describe('deriveOutcome', () => {
  it('marks good when no waking and low grogginess', () => {
    expect(deriveOutcome('no', 1)).toBe('good');
    expect(deriveOutcome('no', 2)).toBe('good');
  });

  it('marks ok when woke or groggy', () => {
    expect(deriveOutcome('yes', 1)).toBe('ok');
    expect(deriveOutcome('no', 3)).toBe('ok');
    expect(deriveOutcome('unsure', 1)).toBe('ok');
  });
});

describe('buildSessionSummary', () => {
  it('describes night waking', () => {
    expect(buildSessionSummary({ woke: 'yes', groggy: 2 })).toMatch(/Woke during/);
  });

  it('does not embed optional notes (shown separately in detail)', () => {
    expect(buildSessionSummary({ woke: 'no', groggy: 1 })).toBe(
      'Slept through. Minimal grogginess.',
    );
  });
});

describe('clearSessions', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('removes all saved nights', async () => {
    await appendSession({
      profileId: 'standard',
      profile: 'Standard',
      woke: 'no',
      groggy: 1,
    });
    expect((await loadSessions()).length).toBe(1);
    await clearSessions();
    expect(await loadSessions()).toEqual([]);
  });
});
