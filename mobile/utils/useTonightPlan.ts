/**
 * Hook: upload features + fetch tonight's plan when the user focuses Tonight
 * or changes the schedule. Stores result in AppState; lets Live consume it.
 *
 * Backend (Python) does the optimization; the mobile side hands over features
 * (mock when offline; Google Health sync via apiClient when connected).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchTonightPlan, loadCachedPlan, uploadFeatures } from './apiClient';
import { buildOfflineTonightPlan } from './devPlanFixture';
import { buildFeatureUpload } from './featureUpload';
import { syncGoogleHealthAndUploadFeatures } from './googleHealthSync';
import { getUserId } from './identity';
import type { FetchPlanResult } from './apiClient';
import type { FeatureRollups } from './apiTypes';
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
  /** Optional debrief rollups to seed features (e.g. last night's woke flag). */
  rollups?: FeatureRollups;
  /** Re-fetch on focus, not on every appNow tick. */
  focusKey?: string | number;
  /**
   * When the user has connected Google Health, ask the backend to sync real
   * sleep/vitals first. Falls back to the mock upload on any failure (incl. 409
   * not-connected).
   */
  googleHealthConnected?: boolean;
};

const STALE_AFTER_MS = 30 * 60 * 1000;

export function useTonightPlan(args: UseTonightPlanArgs): UseTonightPlanResult {
  const { appNow, rollups, focusKey, googleHealthConnected = false } = args;
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
        let featureSetId: string | undefined;

        // Primary path: backend Google Health sync when connected.
        if (googleHealthConnected) {
          try {
            const synced = await syncGoogleHealthAndUploadFeatures({
              bedtimeMinutes,
              wakeMinutes,
              now: appNow,
            });
            featureSetId = synced.featureSetId;
          } catch (syncErr) {
            // 409 (not connected) or transient error → fall back to mock below.
            if (typeof __DEV__ !== 'undefined' && __DEV__) {
              console.warn('[useTonightPlan] google health sync failed, using mock', syncErr);
            }
          }
        }

        // Mock upload when not on Google Health sync — debrief rollups apply here only.
        if (!featureSetId) {
          try {
            const features = await buildFeatureUpload({
              bedtimeMinutes,
              wakeMinutes,
              now: appNow,
              rollups,
            });
            const featuresRes = await uploadFeatures(features);
            featureSetId = featuresRes.featureSetId;
          } catch (uploadErr) {
            // Plan fetch can still succeed (backend uses latest stored features
            // for the user); log and keep going.
            if (typeof __DEV__ !== 'undefined' && __DEV__) {
              console.warn('[useTonightPlan] feature upload failed', uploadErr);
            }
          }
        }

        const userId = await getUserId();
        const result = await fetchTonightPlan(
          {
            userId,
            featureSetId,
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
          setError(`offline · ${result.source}`);
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
      rollups,
      setTonightPlan,
      tonightPlan,
      googleHealthConnected,
    ],
  );

  useEffect(() => {
    refresh();
    // intentionally only on focus/schedule/connection changes — appNow ticks
    // every second in demo mode and would re-fetch forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bedtimeMinutes, wakeMinutes, focusKey, googleHealthConnected]);

  return { status, refresh, source, error };
}
