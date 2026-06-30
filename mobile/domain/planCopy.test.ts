import {
  googleHealthStatusLine,
  planProfileRationale,
  planStatusLine,
} from './planCopy';

describe('planCopy', () => {
  it('drops peak stats from rationale shown in the UI', () => {
    const line = planProfileRationale(
      'Elevated wake-disruption risk in the mid-night (peak p≈0.84 at t≈0.61). Release sustained through that band.',
    );
    expect(line).not.toMatch(/peak|t≈|Release/i);
    expect(line).toMatch(/mid-night/i);
  });

  const googlePlan = {
    profile: {} as never,
    riskCurve: [],
    nightId: 'n1',
    metadata: {
      modelVersion: 'x',
      coldStart: false,
      constraintsHit: [],
      generatedAt: new Date().toISOString(),
      nightId: 'n1',
      sleepDataReason: 'using_google' as const,
    },
  };

  it('names Google Health provenance when sleep data is from sync', () => {
    const line = planStatusLine({
      tonightPlan: googlePlan,
      status: 'ready',
      source: 'network',
      ghStatus: { connected: true, scopes: [] },
    });
    expect(line).toMatch(/Google Health sleep/);
  });

  it('does not claim personalization on mock sleep data', () => {
    const line = planStatusLine({
      tonightPlan: {
        ...googlePlan,
        metadata: { ...googlePlan.metadata, sleepDataSource: 'mock', sleepDataReason: undefined },
      },
      status: 'ready',
      source: 'network',
      ghStatus: { connected: false, scopes: [] },
    });
    expect(line).not.toMatch(/Personalized/i);
    expect(line).toMatch(/mock sleep|Demo delivery/i);
  });

  it('prefers plan sync failure over connected OAuth status', () => {
    const line = googleHealthStatusLine(
      { connected: true, scopes: [] },
      false,
      { sleepDataReason: 'insufficient_data' },
    );
    expect(line).toMatch(/mock sleep/i);
    expect(line).not.toMatch(/Tonight's curve uses your Google Health/i);
  });
});
