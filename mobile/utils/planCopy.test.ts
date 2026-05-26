import {
  googleHealthStatusLine,
  planProfileRationale,
  planRationaleLine,
  sanitizePlanCopy,
} from './planCopy';

describe('sanitizePlanCopy', () => {
  it('replaces em dashes and semicolons', () => {
    expect(sanitizePlanCopy('Higher risk mid-night; sustained taper')).toBe(
      'Higher risk mid-night, sustained taper',
    );
    expect(sanitizePlanCopy('Balanced curve — default')).toBe('Balanced curve, default');
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
    expect(line).not.toMatch(/peak|t≈|Release|…/i);
    expect(line).toMatch(/mid-night/i);
  });
});

describe('googleHealthStatusLine', () => {
  it('shows a checking message while loading with no status', () => {
    expect(googleHealthStatusLine(null, true)).toMatch(/checking/i);
  });

  it('falls back to synthetic estimate when not connected', () => {
    expect(googleHealthStatusLine(null, false)).toMatch(/not connected/i);
    expect(
      googleHealthStatusLine({ connected: false, scopes: [], sandbox: true }, false),
    ).toMatch(/not connected/i);
  });

  it('distinguishes sandbox from live connections', () => {
    const sandbox = googleHealthStatusLine(
      { connected: true, scopes: ['s'], sandbox: true },
      false,
    );
    const live = googleHealthStatusLine(
      { connected: true, scopes: ['s'], sandbox: false },
      false,
    );
    expect(sandbox).toMatch(/demo/i);
    expect(live).toMatch(/syncing/i);
  });

  it('appends last sync time when present', () => {
    const line = googleHealthStatusLine(
      { connected: true, scopes: ['s'], sandbox: false, lastSyncAt: '2026-05-25T03:15:00Z' },
      false,
    );
    expect(line).toMatch(/last sync/i);
  });
});
