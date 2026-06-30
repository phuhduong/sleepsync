import { canApplyTonight } from './applyGates';

function localDate(y: number, mo: number, d: number, h: number, mi: number): Date {
  return new Date(y, mo - 1, d, h, mi, 0, 0);
}

const BED = 22 * 60 + 30;
const WAKE = 6 * 60 + 30;

describe('canApplyTonight', () => {
  const base = {
    now: localDate(2026, 5, 1, 20, 30),
    bedtimeMinutes: BED,
    wakeMinutes: WAKE,
    patchConnected: false,
    bleEnabled: false,
    source: 'network' as const,
    planError: null,
  };

  it('allows apply before bedtime when plan is ready', () => {
    expect(canApplyTonight(base).allowed).toBe(true);
  });

  it('blocks offline-only plan source', () => {
    const result = canApplyTonight({ ...base, source: 'offline' });
    expect(result.allowed).toBe(false);
    expect(result.showRetry).toBe(false);
  });

  it('blocks when plan fetch failed and offers retry', () => {
    const result = canApplyTonight({
      ...base,
      planError: 'Could not load tonight’s plan',
    });
    expect(result.allowed).toBe(false);
    expect(result.showRetry).toBe(true);
  });

  it('requires patch connection when BLE is enabled', () => {
    const result = canApplyTonight({
      ...base,
      bleEnabled: true,
      patchConnected: false,
    });
    expect(result.allowed).toBe(false);
    expect(result.hint).toMatch(/Connect your patch/i);
  });

  it('blocks apply inside the sleep window', () => {
    const insideWindow = localDate(2026, 5, 2, 2, 30);
    expect(
      canApplyTonight({ ...base, now: insideWindow, bleEnabled: false }).allowed,
    ).toBe(false);
    expect(
      canApplyTonight({
        ...base,
        now: insideWindow,
        bleEnabled: true,
        patchConnected: true,
      }).allowed,
    ).toBe(false);
  });
});
