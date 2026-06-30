import type { PlanFetchSource } from '../types/plan';
import { canApplyPatch } from './sleepWindow';

export function canApplyTonight(opts: {
  now: Date;
  bedtimeMinutes: number;
  wakeMinutes: number;
  patchConnected: boolean;
  bleEnabled: boolean;
  source: PlanFetchSource | null;
  planError: string | null;
}): { allowed: boolean; hint: string | null; showRetry: boolean } {
  if (opts.source === 'offline') {
    return {
      allowed: false,
      hint: 'Plan unavailable offline. Connect to the server to start tonight.',
      showRetry: false,
    };
  }
  if (opts.planError) {
    return {
      allowed: false,
      hint: opts.planError ?? 'Could not load tonight’s plan. Tap to retry.',
      showRetry: true,
    };
  }
  if (opts.bleEnabled && !opts.patchConnected) {
    return {
      allowed: false,
      hint: 'Connect your patch before starting tonight’s session',
      showRetry: false,
    };
  }
  if (!canApplyPatch(opts.now, opts.bedtimeMinutes, opts.wakeMinutes)) {
    return {
      allowed: false,
      hint: 'Apply opens before bedtime — not during your sleep window',
      showRetry: false,
    };
  }
  return { allowed: true, hint: null, showRetry: false };
}
