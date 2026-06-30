import { resolvePendingSessionRoute } from './sessionResume';

describe('resolvePendingSessionRoute', () => {
  const bed = 22 * 60 + 30;
  const wake = 6 * 60 + 30;

  it('returns null when there is no pending session', () => {
    expect(
      resolvePendingSessionRoute({
        now: new Date(2026, 5, 1, 21, 0),
        pendingSession: null,
        bedtimeMinutes: bed,
        wakeMinutes: wake,
      }),
    ).toBeNull();
  });

  it('resumes live before wake', () => {
    expect(
      resolvePendingSessionRoute({
        now: new Date(2026, 5, 1, 23, 0),
        pendingSession: {
          profileId: 'p1',
          startedAt: new Date(2026, 5, 1, 21, 0).toISOString(),
        },
        bedtimeMinutes: bed,
        wakeMinutes: wake,
      }),
    ).toBe('/live');
  });

  it('routes to debrief after wake', () => {
    expect(
      resolvePendingSessionRoute({
        now: new Date(2026, 5, 2, 7, 0),
        pendingSession: {
          profileId: 'p1',
          startedAt: new Date(2026, 5, 1, 21, 0).toISOString(),
        },
        bedtimeMinutes: bed,
        wakeMinutes: wake,
      }),
    ).toBe('/debrief');
  });
});
