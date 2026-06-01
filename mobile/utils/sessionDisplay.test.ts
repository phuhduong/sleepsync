import { sessionDetailHeading, sessionListTitle } from './sessionDisplay';
import type { SessionRecord } from './profiles';

const base: SessionRecord = {
  id: 'night-1',
  date: 'May 24',
  profileId: 'generated-x',
  profile: "Tonight's Plan",
  outcome: 'ok',
  summary: 'Slept through with mild morning grogginess.',
  woke: 'no',
  groggy: 3,
  completedAt: '2026-05-24T12:00:00Z',
};

describe('sessionDisplay', () => {
  it('uses full summary on the list row', () => {
    expect(sessionListTitle(base)).toBe(base.summary);
  });

  it('uses a short observational detail hero, not the summary sentence', () => {
    expect(sessionDetailHeading(base)).toBe('Mild morning grogginess');
    expect(sessionDetailHeading(base).length).toBeLessThan(40);
  });

  it('labels uninterrupted sleep when debrief was clean', () => {
    const s = { ...base, groggy: 1, outcome: 'good' as const };
    expect(sessionDetailHeading(s)).toBe('Uninterrupted sleep');
  });

  it('prefers bed–wake on detail when schedule was saved', () => {
    const s = { ...base, bedtimeMinutes: 22 * 60 + 30, wakeMinutes: 6 * 60 + 30 };
    expect(sessionDetailHeading(s)).toMatch(/10:30 PM/);
    expect(sessionDetailHeading(s)).not.toContain('grogginess');
  });
});
