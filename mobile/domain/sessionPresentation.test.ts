import { sessionDetailHeading } from './sessionPresentation';
import type { SessionRecord } from './profiles';

describe('sessionDetailHeading', () => {
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

  it('prefers bed–wake labels when schedule was saved', () => {
    const s = { ...base, bedtimeMinutes: 22 * 60 + 30, wakeMinutes: 6 * 60 + 30 };
    expect(sessionDetailHeading(s)).toMatch(/10:30 PM/);
  });

  it('summarizes debrief grogginess and wake outcomes', () => {
    expect(sessionDetailHeading(base)).toBe('Mild morning grogginess');
    expect(sessionDetailHeading({ ...base, groggy: 1, outcome: 'good' })).toBe(
      'Uninterrupted sleep',
    );
    expect(sessionDetailHeading({ ...base, woke: 'yes' })).toBe('Interrupted sleep');
  });
});
