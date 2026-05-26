import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Profile } from '../utils/profiles';
import type { PlanMetadata, RiskPoint } from '../utils/apiTypes';
import {
  DEFAULT_BEDTIME_MINUTES,
  DEFAULT_WAKE_MINUTES,
  clampMinutes,
} from '../utils/sleepSchedule';

export type PendingSession = {
  profileId: string;
  startedAt: string;
};

export type TonightPlanState = {
  profile: Profile;
  riskCurve: RiskPoint[];
  metadata: PlanMetadata;
  nightId: string;
};

type AppState = {
  bedtimeMinutes: number;
  setBedtimeMinutes: (m: number) => void;
  wakeMinutes: number;
  setWakeMinutes: (m: number) => void;
  pendingSession: PendingSession | null;
  setPendingSession: (session: PendingSession | null) => void;
  clearPendingSession: () => void;
  tonightPlan: TonightPlanState | null;
  setTonightPlan: (plan: TonightPlanState | null) => void;
  nightId: string | null;
};

const Ctx = createContext<AppState | null>(null);

const SCHEDULE_STORAGE_KEY = '@sleepsync/schedule';

type StoredSchedule = { bedtimeMinutes: number; wakeMinutes: number };

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [bedtimeMinutes, setBedtimeMinutesState] = useState(DEFAULT_BEDTIME_MINUTES);
  const [wakeMinutes, setWakeMinutesState] = useState(DEFAULT_WAKE_MINUTES);
  const [pendingSession, setPendingSessionState] = useState<PendingSession | null>(null);
  const [tonightPlan, setTonightPlanState] = useState<TonightPlanState | null>(null);
  const scheduleHydratedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SCHEDULE_STORAGE_KEY);
        if (!raw || cancelled) return;
        const parsed = JSON.parse(raw) as Partial<StoredSchedule>;
        if (typeof parsed.bedtimeMinutes === 'number') {
          setBedtimeMinutesState(clampMinutes(parsed.bedtimeMinutes));
        }
        if (typeof parsed.wakeMinutes === 'number') {
          setWakeMinutesState(clampMinutes(parsed.wakeMinutes));
        }
      } catch {
        // ignore — defaults are fine
      } finally {
        scheduleHydratedRef.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!scheduleHydratedRef.current) return;
    const payload: StoredSchedule = { bedtimeMinutes, wakeMinutes };
    AsyncStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(payload)).catch(() => {});
  }, [bedtimeMinutes, wakeMinutes]);

  const setBedtimeMinutes = (m: number) => setBedtimeMinutesState(clampMinutes(m));
  const setWakeMinutes = (m: number) => setWakeMinutesState(clampMinutes(m));

  const setPendingSession = useCallback((session: PendingSession | null) => {
    setPendingSessionState(session);
  }, []);

  const clearPendingSession = useCallback(() => {
    setPendingSessionState(null);
  }, []);

  const setTonightPlan = useCallback((plan: TonightPlanState | null) => {
    setTonightPlanState(plan);
  }, []);

  return (
    <Ctx.Provider
      value={{
        bedtimeMinutes,
        setBedtimeMinutes,
        wakeMinutes,
        setWakeMinutes,
        pendingSession,
        setPendingSession,
        clearPendingSession,
        tonightPlan,
        setTonightPlan,
        nightId: tonightPlan?.nightId ?? null,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAppState() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppState must be used inside AppStateProvider');
  return v;
}
