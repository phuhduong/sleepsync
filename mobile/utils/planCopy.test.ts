import {
  effectiveSleepDataReason,
  googleHealthConnectionLine,
  googleHealthStatusLine,
  planProfileRationale,
  planRationaleLine,
  planSleepProvenanceLine,
  planStatusLine,
  sanitizePlanCopy,
  sleepDataStatusLine,
} from './planCopy';

describe('sanitizePlanCopy', () => {
  it('replaces em dashes, middots, and semicolons', () => {
    expect(sanitizePlanCopy('Higher risk mid-night; sustained taper')).toBe(
      'Higher risk mid-night, sustained taper',
    );
    expect(sanitizePlanCopy('Balanced curve — default')).toBe('Balanced curve, default');
    expect(sanitizePlanCopy('One · two')).toBe('One, two');
  });
});

describe('planRationaleLine', () => {
  it('sanitizes before truncating', () => {
    const line = planRationaleLine('One; two — three');
    expect(line).not.toMatch(/[;—]/);
  });
});

describe('planProfileRationale', () => {
  it('drops peak stats and release follow-up', () => {
    const line = planProfileRationale(
      'Elevated wake-disruption risk in the mid-night (peak p≈0.84 at t≈0.61). Release sustained through that band.',
    );
    expect(line).not.toMatch(/peak|t≈|Release/i);
    expect(line).toMatch(/mid-night/i);
  });
});

describe('planSleepProvenanceLine', () => {
  it('names both sleep data and debriefs for google path', () => {
    const line = planSleepProvenanceLine('using_google');
    expect(line).toMatch(/Google Health sleep/);
    expect(line).toMatch(/debriefs/);
    expect(line).not.toMatch(/debrief adjusts/i);
  });

  it('folds sync time into one sentence', () => {
    const line = planSleepProvenanceLine('using_google', '2026-05-25T03:15:00Z');
    expect(line).toMatch(/last synced at/);
    expect(line).not.toMatch(/debrief adjusts/i);
  });

  it('describes sample path when not connected', () => {
    expect(planSleepProvenanceLine('not_connected')).toMatch(/mock sleep data/i);
  });
});

describe('googleHealthConnectionLine', () => {
  it('only describes oauth and sync', () => {
    const line = googleHealthConnectionLine(
      { connected: true, scopes: [], lastSyncAt: '2026-05-25T03:15:00Z' },
      false,
    );
    expect(line).toMatch(/Connected/);
    expect(line).toMatch(/last synced at/);
    expect(line).not.toMatch(/curve/);
    expect(line).not.toMatch(/debrief/i);
  });
});

describe('effectiveSleepDataReason', () => {
  it('maps google reasons to not_connected when oauth is off', () => {
    expect(effectiveSleepDataReason('using_google', false)).toBe('not_connected');
    expect(effectiveSleepDataReason('insufficient_data', false)).toBe('not_connected');
    expect(effectiveSleepDataReason('using_google', true)).toBe('using_google');
    expect(effectiveSleepDataReason('connect_failed', false)).toBe('connect_failed');
  });
});

describe('sleepDataStatusLine', () => {
  it('prefers plan reason over oauth connected state', () => {
    const line = sleepDataStatusLine({
      sleepDataReason: 'insufficient_data',
      ghStatus: { connected: true, scopes: [] },
      ghLoading: false,
    });
    expect(line).toMatch(/mock sleep data/i);
    expect(line).not.toMatch(/Tonight's curve uses your Google Health/i);
  });

  it('does not claim connected when oauth is off', () => {
    const line = sleepDataStatusLine({
      sleepDataReason: 'insufficient_data',
      ghStatus: { connected: false, scopes: [] },
      ghLoading: false,
    });
    expect(line).toMatch(/mock sleep data/i);
    expect(line).not.toMatch(/Google Health is connected/i);
  });
});

describe('planStatusLine', () => {
  it('prefers sleepDataReason from metadata', () => {
    const line = planStatusLine({
      tonightPlan: {
        profile: {} as never,
        riskCurve: [],
        nightId: 'n1',
        metadata: {
          modelVersion: 'x',
          coldStart: false,
          constraintsHit: [],
          generatedAt: new Date().toISOString(),
          nightId: 'n1',
          sleepDataReason: 'insufficient_data',
        },
      },
      status: 'ready',
      source: 'network',
      ghStatus: { connected: true, scopes: [] },
    });
    expect(line).toMatch(/mock sleep data/i);
    expect(line).toMatch(/Google Health is connected/i);
  });

  it('hides connected copy when oauth is off', () => {
    const line = planStatusLine({
      tonightPlan: {
        profile: {} as never,
        riskCurve: [],
        nightId: 'n1',
        metadata: {
          modelVersion: 'x',
          coldStart: false,
          constraintsHit: [],
          generatedAt: new Date().toISOString(),
          nightId: 'n1',
          sleepDataReason: 'insufficient_data',
        },
      },
      status: 'ready',
      source: 'network',
      ghStatus: { connected: false, scopes: [] },
    });
    expect(line).toMatch(/mock sleep data/i);
    expect(line).not.toMatch(/Google Health is connected/i);
  });
});

describe('googleHealthStatusLine', () => {
  it('delegates to plan metadata when provided', () => {
    const line = googleHealthStatusLine(
      { connected: true, scopes: [] },
      false,
      { sleepDataReason: 'insufficient_data' } as never,
    );
    expect(line).toMatch(/mock sleep data/i);
  });

  it('connectionOnly still resolves for non-card callers', () => {
    expect(
      googleHealthStatusLine(
        { connected: true, scopes: [], lastSyncAt: '2026-05-25T03:15:00Z' },
        false,
        { sleepDataReason: 'using_google' } as never,
        false,
        { connectionOnly: true },
      ),
    ).toMatch(/Connected, last synced at/);
  });
});
