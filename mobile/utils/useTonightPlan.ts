/**
 * Hook: fetch tonight's plan when the user focuses Tonight or changes schedule.
 *
 * Backend owns feature fusion (Google Health history or shared mock week + debrief K).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchTonightPlan, loadCachedPlan } from './apiClient';
import { buildOfflineTonightPlan } from './devPlanFixture';
import { syncGoogleHealthAndUploadFeatures } from './googleHealthSync';
import { getUserId } from './identity';
import type { FetchPlanResult } from './apiClient';
import { useAppState } from '../state/AppState';

function timezoneName(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export type PlanFetchStatus = 'idle' | 'loading' | 'ready' | 'error';

export type UseTonightPlanResult = {
  status: PlanFetchStatus;
  refresh: (opts?: { force?: boolean }) => Promise<void>;
  source: FetchPlanResult['source'] | null;
  error: string | null;
};

export type UseTonightPlanArgs = {
  appNow: Date;
  /** Re-fetch on focus, not on every appNow tick. */
  focusKey?: string | number;
  /** When connected, backend syncs Google Health before building the plan. */
  googleHealthConnected?: boolean;
};

const STALE_AFTER_MS = 30 * 60 * 1000;

export function useTonightPlan(args: UseTonightPlanArgs): UseTonightPlanResult {
  const { appNow, focusKey, googleHealthConnected = false } = args;
  const {
    bedtimeMinutes,
    wakeMinutes,
    tonightPlan,
    setTonightPlan,
  } = useAppState();

  const [status, setStatus] = useState<PlanFetchStatus>(tonightPlan ? 'ready' : 'idle');
  const [source, setSource] = useState<FetchPlanResult['source'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastFetchAtRef = useRef<number>(0);
  const prevGoogleConnectedRef = useRef(googleHealthConnected);

  const refresh = useCallback(
    async (opts?: { force?: boolean }) => {
      const force = opts?.force ?? false;
      const ageMs = Date.now() - lastFetchAtRef.current;
      if (!force && tonightPlan && ageMs < STALE_AFTER_MS) {
        return;
      }
      setStatus('loading');
      setError(null);
      try {
        const timezone = timezoneName();
        const referenceNow = appNow.toISOString();

        if (googleHealthConnected) {
          try {
            await syncGoogleHealthAndUploadFeatures({
              bedtimeMinutes,
              wakeMinutes,
            });
          } catch (syncErr) {
            if (typeof __DEV__ !== 'undefined' && __DEV__) {
              console.warn('[useTonightPlan] google health sync failed', syncErr);
            }
          }
        }

        const userId = await getUserId();
        const result = await fetchTonightPlan(
          {
            userId,
            nightId: tonightPlan?.nightId,
            bedtimeMinutes,
            wakeMinutes,
            timezone,
            referenceNow,
          },
          appNow,
        );
        setTonightPlan({
          profile: result.plan.profile,
          riskCurve: result.plan.riskCurve,
          metadata: result.plan.metadata,
          nightId: result.plan.nightId,
        });
        setSource(result.source);
        setStatus('ready');
        lastFetchAtRef.current = Date.now();
        if (result.source !== 'network' && result.error) {
          setError(`Offline, ${result.source}.`);
        }
      } catch (err) {
        const userId = await getUserId().catch(() => null);
        const cached = userId ? await loadCachedPlan(userId) : null;
        if (cached) {
          setTonightPlan({
            profile: cached.profile,
            riskCurve: cached.riskCurve,
            metadata: cached.metadata,
            nightId: cached.nightId,
          });
          setSource('cache');
        } else {
          const offline = buildOfflineTonightPlan(appNow);
          setTonightPlan({
            profile: offline.profile,
            riskCurve: offline.riskCurve,
            metadata: offline.metadata,
            nightId: offline.nightId,
          });
          setSource('offline');
        }
        setStatus('ready');
        setError((err as Error).message);
      }
    },
    [
      appNow,
      bedtimeMinutes,
      wakeMinutes,
      setTonightPlan,
      tonightPlan,
      googleHealthConnected,
    ],
  );

  useEffect(() => {
    const connectionChanged = prevGoogleConnectedRef.current !== googleHealthConnected;
    prevGoogleConnectedRef.current = googleHealthConnected;
    void refresh({ force: connectionChanged });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bedtimeMinutes, wakeMinutes, focusKey, googleHealthConnected]);

  return { status, refresh, source, error };
}
