import type { TonightPlanState } from '../state/AppState';
import type { FetchPlanResult } from './apiClient';
import type { GoogleHealthStatus } from './apiTypes';

/** One line for Tonight home — no long rationale. */
export function planStatusLine(opts: {
  tonightPlan: TonightPlanState | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  source: FetchPlanResult['source'] | null;
  coldStart: boolean;
}): string {
  const { tonightPlan, status, source, coldStart } = opts;
  if (status === 'loading' && !tonightPlan) return 'Building your plan…';
  if (!tonightPlan) return 'Offline, standard delivery until personalized';
  if (coldStart) return 'Conservative curve · limited history';
  if (source === 'offline') return 'Offline · standard curve until backend is available';
  if (source === 'fixture') return 'Preview plan, backend offline';
  if (source === 'cache') return 'Offline, using your last plan';
  return 'Personalized for tonight';
}

/** One line describing the Google Health connection for the Connect UI. */
export function googleHealthStatusLine(
  status: GoogleHealthStatus | null,
  loading: boolean,
): string {
  if (loading && !status) return 'Checking connection…';
  if (!status || !status.connected) {
    return 'Not connected, using a synthetic sleep estimate';
  }
  const base = status.sandbox
    ? 'Connected in demo mode, synthetic Google Health data'
    : 'Connected, syncing your Google Health sleep and vitals';
  if (status.lastSyncAt) {
    const when = new Date(status.lastSyncAt);
    if (!Number.isNaN(when.getTime())) {
      const time = when.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      return `${base} · last sync ${time}`;
    }
  }
  return base;
}

/** User-facing copy: no em dashes or semicolons. */
export function sanitizePlanCopy(text: string): string {
  return text
    .replace(/\s*—\s*/g, ', ')
    .replace(/;/g, ',')
    .replace(/,\s*,/g, ',')
    .trim();
}

/** Single-line plan explanation for detail screens. */
export function planRationaleLine(text: string, maxLen = 96): string {
  const t = sanitizePlanCopy(text);
  if (t.length <= maxLen) return t;
  const cut = t.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > 40 ? cut.slice(0, lastSpace) : cut;
  return `${base.trim()}…`;
}

/** Short blurb under Profile charts — no ML stats, release boilerplate, or truncation. */
export function planProfileRationale(text: string): string {
  let t = sanitizePlanCopy(text);
  t = t.replace(/\s*\(peak[^)]*\)/gi, '').trim();
  const period = t.indexOf('.');
  if (period > 0) t = t.slice(0, period).trim();
  return t;
}
