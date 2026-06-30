import type { TonightPlan, GoogleHealthStatus, PlanMetadata, PlanFetchSource } from '../types/plan';

export type SleepDataReason = NonNullable<PlanMetadata['sleepDataReason']>;

function isProdBuild(): boolean {
  return typeof __DEV__ === 'undefined' || !__DEV__;
}

function mockDataLine(): string {
  return isProdBuild()
    ? 'Demo delivery curve (not personalized). Connect Google Health for your sleep data.'
    : 'Tonight\'s curve uses mock sleep data, connect Google Health for yours.';
}

function formatSyncTime(iso: string): string | null {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return null;
  return when.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function provenanceLine(reason: SleepDataReason, lastSyncAt?: string | null): string {
  switch (reason) {
    case 'using_google': {
      const sync = lastSyncAt ? formatSyncTime(lastSyncAt) : null;
      if (sync) {
        return `Tonight's curve uses your Google Health sleep and your recent debriefs, last synced at ${sync}.`;
      }
      return 'Tonight\'s curve uses your Google Health sleep and your recent debriefs.';
    }
    case 'insufficient_data':
      return isProdBuild()
        ? 'Google Health connected. Demo curve until more nights sync.'
        : 'Google Health is connected. Mock sleep until more nights sync.';
    case 'connect_failed':
      return isProdBuild()
        ? 'Could not reach Google Health. Using demo curve until sync succeeds.'
        : 'Could not reach Google Health, tonight\'s curve uses mock sleep data.';
    case 'not_connected':
    default:
      return mockDataLine();
  }
}

function dataSourceLine(opts: {
  sleepDataReason?: SleepDataReason | null;
  ghStatus?: GoogleHealthStatus | null;
  ghLoading?: boolean;
  planLoading?: boolean;
  ghSyncWarning?: string | null;
}): string {
  if (opts.ghSyncWarning) return opts.ghSyncWarning;
  if (opts.planLoading) return 'Building your plan.';
  if (opts.sleepDataReason) {
    return provenanceLine(opts.sleepDataReason, opts.ghStatus?.lastSyncAt);
  }
  if (opts.ghLoading) return 'Checking connection.';
  if (!opts.ghStatus?.connected) return provenanceLine('not_connected');
  return 'Connected, loading tonight\'s plan.';
}

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

export function planStatusLine(opts: {
  tonightPlan: TonightPlan | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  source: PlanFetchSource | null;
  ghStatus?: GoogleHealthStatus | null;
  ghSyncWarning?: string | null;
}): string {
  const { tonightPlan, status, source, ghStatus, ghSyncWarning } = opts;

  if (status === 'loading' && !tonightPlan) {
    return dataSourceLine({ planLoading: true, ghSyncWarning });
  }

  if (tonightPlan?.metadata.sleepDataReason) {
    return dataSourceLine({
      sleepDataReason: tonightPlan.metadata.sleepDataReason,
      ghStatus,
      ghSyncWarning,
    });
  }

  if (!tonightPlan) {
    return isProdBuild()
      ? 'Set your schedule and build tonight\'s plan.'
      : 'Offline, standard delivery until personalized.';
  }
  if (source === 'offline') {
    return isProdBuild()
      ? 'Offline. Demo curve until the backend is available.'
      : 'Offline, standard curve until backend is available.';
  }
  if (source === 'cache') return 'Offline, using your last plan.';
  if (tonightPlan.metadata.sleepDataSource === 'google_health') {
    return 'Personalized delivery curve for your schedule.';
  }
  return mockDataLine();
}

export function googleHealthStatusLine(
  status: GoogleHealthStatus | null,
  loading: boolean,
  planMetadata?: Pick<PlanMetadata, 'sleepDataReason'> | null,
  planLoading?: boolean,
  opts?: { connectionOnly?: boolean },
): string {
  if (opts?.connectionOnly) return googleHealthConnectionLine(status, loading);
  return dataSourceLine({
    sleepDataReason: planMetadata?.sleepDataReason,
    ghStatus: status,
    ghLoading: loading,
    planLoading,
  });
}

export function sanitizePlanCopy(text: string): string {
  return text
    .replace(/\s*—\s*/g, ', ')
    .replace(/\s*·\s*/g, ', ')
    .replace(/;/g, ',')
    .replace(/…/g, '.')
    .replace(/,\s*,/g, ',')
    .trim();
}

export function planProfileRationale(text: string): string {
  let t = sanitizePlanCopy(text);
  t = t.replace(/\s*\(peak[^)]*\)/gi, '').trim();
  const period = t.indexOf('.');
  if (period > 0) t = t.slice(0, period).trim();
  return t;
}

export function wearableProvenanceLine(verified: boolean | undefined): string | null {
  if (verified === undefined) return null;
  return verified
    ? 'Wearable sleep data: verified (Google Health).'
    : 'Wearable sleep data: self-reported (dev only).';
}
