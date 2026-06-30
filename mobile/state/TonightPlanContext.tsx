import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAppNow } from '../theme/CircadianThemeProvider';
import { STALE_AFTER_MS } from '../constants';
import { fetchTonightPlan, type FetchPlanResult } from '../services/planService';
import { syncGoogleHealthFeatures } from '../services/googleHealthApi';
import { getUserId, linkAnonymousIdentityIfNeeded } from '../services/identity';
import { ensureSupabaseSession, isSupabaseConfigured } from '../services/supabaseAuth';
import { subscribeSessionLog } from '../services/sessionLog';
import { timezoneName } from '../domain/sleepSchedule';
import type { TonightPlan } from '../services/apiTypes';
import { useAppState } from './AppState';
import { useGoogleHealth } from './GoogleHealthContext';

export type PlanFetchStatus = 'idle' | 'loading' | 'ready' | 'error';

export type TonightPlanState = {
  plan: TonightPlan | null;
  nightId: string | null;
  status: PlanFetchStatus;
  source: FetchPlanResult['source'] | null;
  error: string | null;
  ghSyncWarning: string | null;
  retry: () => void;
  clearPlan: () => void;
};

type RefreshOptions = {
  ignoreStale?: boolean;
  forceRegenerate?: boolean;
  syncGoogleHealth?: boolean;
};

const Ctx = createContext<TonightPlanState | null>(null);

export function TonightPlanProvider({ children }: { children: ReactNode }) {
  const appNow = useAppNow();
  const { connected: googleHealthConnected } = useGoogleHealth();
  const { bedtimeMinutes, wakeMinutes } = useAppState();

  const [plan, setPlan] = useState<TonightPlan | null>(null);
  const [status, setStatus] = useState<PlanFetchStatus>('idle');
  const [source, setSource] = useState<FetchPlanResult['source'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ghSyncWarning, setGhSyncWarning] = useState<string | null>(null);
  const lastFetchAtRef = useRef(0);
  const planRef = useRef<TonightPlan | null>(null);
  const scheduleDepsInitializedRef = useRef(false);
  const prevGoogleConnectedRef = useRef(googleHealthConnected);
  const prevScheduleRef = useRef({ bedtimeMinutes, wakeMinutes });
  const inFlightRef = useRef<Promise<void> | null>(null);
  const pendingRefreshRef = useRef(false);
  planRef.current = plan;

  const clearPlan = useCallback(() => {
    setPlan(null);
    setSource(null);
    setStatus('idle');
    setError(null);
    setGhSyncWarning(null);
  }, []);

  const refresh = useCallback(
    async (options: RefreshOptions = {}) => {
      if (inFlightRef.current) {
        pendingRefreshRef.current = true;
        return inFlightRef.current;
      }

      const runOnce = async (opts: RefreshOptions) => {
        const { ignoreStale = false, forceRegenerate = false, syncGoogleHealth = false } = opts;
        const ageMs = Date.now() - lastFetchAtRef.current;
        if (!ignoreStale && !forceRegenerate && planRef.current && ageMs < STALE_AFTER_MS) {
          return;
        }

        setStatus('loading');
        setError(null);
        setGhSyncWarning(null);

        if (syncGoogleHealth && googleHealthConnected) {
          try {
            await syncGoogleHealthFeatures({
              bedtimeMinutes,
              wakeMinutes,
              timezone: timezoneName(),
              dataNow: new Date().toISOString(),
            });
          } catch (syncErr) {
            setGhSyncWarning(
              'Google Health sync failed. Tonight may use the last available sleep data.',
            );
            if (__DEV__) console.warn('[TonightPlanProvider] google health sync failed', syncErr);
          }
        }

        try {
          const userId = await getUserId();
          const currentPlan = planRef.current;
          const result = await fetchTonightPlan(
            {
              userId,
              nightId: currentPlan?.nightId,
              bedtimeMinutes,
              wakeMinutes,
              timezone: timezoneName(),
              referenceNow: appNow.toISOString(),
              forceRegenerate,
            },
            appNow,
          );
          setPlan(result.plan);
          setSource(result.source);
          setStatus('ready');
          lastFetchAtRef.current = Date.now();
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Could not load tonight’s plan';
          setError(message);
          setStatus('error');
          if (__DEV__) console.warn('[TonightPlanProvider] plan fetch failed', err);
        }
      };

      const task = (async () => {
        await runOnce(options);
        if (pendingRefreshRef.current) {
          pendingRefreshRef.current = false;
          await runOnce({ ignoreStale: true, forceRegenerate: true });
        }
      })().finally(() => {
        inFlightRef.current = null;
      });

      inFlightRef.current = task;
      return task;
    },
    [appNow, bedtimeMinutes, wakeMinutes, googleHealthConnected],
  );

  const retry = useCallback(() => {
    void refresh({ ignoreStale: true, syncGoogleHealth: googleHealthConnected });
  }, [refresh, googleHealthConnected]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    return subscribeSessionLog(() => {
      void refresh({ ignoreStale: true });
    });
  }, [refresh]);

  useEffect(() => {
    void linkAnonymousIdentityIfNeeded();
    if (isSupabaseConfigured()) {
      void ensureSupabaseSession().catch((err) => {
        if (__DEV__) console.warn('[TonightPlanProvider] supabase session failed', err);
      });
    }
  }, []);

  useEffect(() => {
    if (!scheduleDepsInitializedRef.current) {
      scheduleDepsInitializedRef.current = true;
      prevGoogleConnectedRef.current = googleHealthConnected;
      prevScheduleRef.current = { bedtimeMinutes, wakeMinutes };
      return;
    }

    const ghChanged = prevGoogleConnectedRef.current !== googleHealthConnected;
    prevGoogleConnectedRef.current = googleHealthConnected;

    const scheduleChanged =
      prevScheduleRef.current.bedtimeMinutes !== bedtimeMinutes ||
      prevScheduleRef.current.wakeMinutes !== wakeMinutes;
    prevScheduleRef.current = { bedtimeMinutes, wakeMinutes };

    if (!scheduleChanged && !ghChanged) return;

    void refresh({
      forceRegenerate: scheduleChanged || ghChanged,
      syncGoogleHealth: ghChanged && googleHealthConnected,
    });
  }, [bedtimeMinutes, wakeMinutes, googleHealthConnected, refresh]);

  return (
    <Ctx.Provider
      value={{
        plan,
        nightId: plan?.nightId ?? null,
        status,
        source,
        error,
        ghSyncWarning,
        retry,
        clearPlan,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useTonightPlan(): TonightPlanState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTonightPlan must be used inside TonightPlanProvider');
  return v;
}
