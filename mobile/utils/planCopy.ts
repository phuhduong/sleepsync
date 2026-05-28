import type { TonightPlanState } from '../state/AppState';
import type { FetchPlanResult } from './apiClient';
import type { GoogleHealthStatus, PlanMetadata } from './apiTypes';

export type SleepDataReason = NonNullable<PlanMetadata['sleepDataReason']>;

/** Plan metadata can lag OAuth; never show "connected" copy when status says disconnected. */
export function effectiveSleepDataReason(
  reason: SleepDataReason | null | undefined,
  ghConnected: boolean | undefined,
): SleepDataReason | null {
  if (!reason) return null;
  if (ghConnected === false && (reason === 'using_google' || reason === 'insufficient_data')) {
    return 'not_connected';
  }
  return reason;
}

function formatSyncTime(iso: string): string | null {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return null;
  return when.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** What sleep data and feedback shaped tonight's plan (from server metadata). */
export function planSleepProvenanceLine(
  reason: SleepDataReason,
  lastSyncAt?: string | null,
): string {
  switch (reason) {
    case 'using_google': {
      const sync = lastSyncAt ? formatSyncTime(lastSyncAt) : null;
      if (sync) {
        return `Tonight's curve uses your Google Health sleep and your recent debriefs, last synced at ${sync}.`;
      }
      return 'Tonight\'s curve uses your Google Health sleep and your recent debriefs.';
    }
    case 'insufficient_data':
      return 'Google Health is connected, but tonight\'s curve uses mock sleep data until more nights sync.';
    case 'connect_failed':
      return 'Could not reach Google Health, tonight\'s curve uses mock sleep data.';
    case 'not_connected':
    default:
      return 'Tonight\'s curve uses mock sleep data, connect Google Health for yours.';
  }
}

/** OAuth link state only, for the connect card (no plan curve explanation). */
export function googleHealthConnectionLine(
  status: GoogleHealthStatus | null,
  loading: boolean,
): string {
  if (loading) return 'Checking connection.';
  if (!status?.connected) return 'Not connected.';
  const sync = status.lastSyncAt ? formatSyncTime(status.lastSyncAt) : null;
  if (sync) return `Connected, last synced at ${sync}.`;
  return 'Connected.';
}

export function sleepDataStatusLine(opts: {
  sleepDataReason?: SleepDataReason | null;
  ghStatus?: GoogleHealthStatus | null;
  ghLoading?: boolean;
  planLoading?: boolean;
}): string {
  if (opts.planLoading) return 'Building your plan.';
  const reason = effectiveSleepDataReason(
    opts.sleepDataReason,
    opts.ghStatus?.connected,
  );
  if (reason) {
    return planSleepProvenanceLine(reason, opts.ghStatus?.lastSyncAt);
  }
  if (opts.ghLoading) return 'Checking connection.';
  if (!opts.ghStatus?.connected) return planSleepProvenanceLine('not_connected');
  return 'Connected, loading tonight\'s plan.';
}

/** One line under the profile name on Tonight / Profile. */
export function planStatusLine(opts: {
  tonightPlan: TonightPlanState | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  source: FetchPlanResult['source'] | null;
  ghStatus?: GoogleHealthStatus | null;
}): string {
  const { tonightPlan, status, source, ghStatus } = opts;

  if (status === 'loading' && !tonightPlan) {
    return sleepDataStatusLine({ planLoading: true });
  }

  const reason = effectiveSleepDataReason(
    tonightPlan?.metadata.sleepDataReason,
    ghStatus?.connected,
  );
  if (reason) {
    return planSleepProvenanceLine(reason, ghStatus?.lastSyncAt);
  }

  if (!tonightPlan) return 'Offline, standard delivery until personalized.';
  if (source === 'offline') return 'Offline, standard curve until backend is available.';
  if (source === 'fixture') return 'Preview plan, backend offline.';
  if (source === 'cache') return 'Offline, using your last plan.';
  return 'Personalized delivery curve for your schedule.';
}

/** @deprecated Use planSleepProvenanceLine */
export function sleepDataReasonLine(reason: SleepDataReason): string {
  return planSleepProvenanceLine(reason);
}

/** Connect card data line: plan provenance when known, else connection state. */
export function googleHealthStatusLine(
  status: GoogleHealthStatus | null,
  loading: boolean,
  planMetadata?: Pick<PlanMetadata, 'sleepDataReason'> | null,
  planLoading?: boolean,
  opts?: { connectionOnly?: boolean },
): string {
  if (opts?.connectionOnly) {
    return googleHealthConnectionLine(status, loading);
  }
  return sleepDataStatusLine({
    sleepDataReason: planMetadata?.sleepDataReason,
    ghStatus: status,
    ghLoading: loading,
    planLoading,
  });
}

/** User-facing copy: plain English, periods and commas only. */
export function sanitizePlanCopy(text: string): string {
  return text
    .replace(/\s*—\s*/g, ', ')
    .replace(/\s*·\s*/g, ', ')
    .replace(/;/g, ',')
    .replace(/…/g, '.')
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
  return `${base.trim()}.`;
}

/** Short blurb under Profile charts — no ML stats, release boilerplate, or truncation. */
export function planProfileRationale(text: string): string {
  let t = sanitizePlanCopy(text);
  t = t.replace(/\s*\(peak[^)]*\)/gi, '').trim();
  const period = t.indexOf('.');
  if (period > 0) t = t.slice(0, period).trim();
  return t;
}
