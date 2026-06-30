import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_BEDTIME_MINUTES,
  DEFAULT_WAKE_MINUTES,
  clampMinutes,
} from '../domain/sleepSchedule';
import type { PendingSession } from '../domain/profiles';
import { storageGetItem, storageRemoveItem, storageSetItem } from '../services/storage';

export type { PendingSession };

type AppState = {
  bedtimeMinutes: number;
  setBedtimeMinutes: (m: number) => void;
  wakeMinutes: number;
  setWakeMinutes: (m: number) => void;
  pendingSession: PendingSession | null;
  setPendingSession: (session: PendingSession | null) => void;
  clearPendingSession: () => void;
  hydrated: boolean;
};

const Ctx = createContext<AppState | null>(null);

const SCHEDULE_STORAGE_KEY = '@sleepsync/schedule';
const PENDING_SESSION_STORAGE_KEY = '@sleepsync/pending-session';

type StoredSchedule = { bedtimeMinutes: number; wakeMinutes: number };

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [bedtimeMinutes, setBedtimeMinutesState] = useState(DEFAULT_BEDTIME_MINUTES);
  const [wakeMinutes, setWakeMinutesState] = useState(DEFAULT_WAKE_MINUTES);
  const [pendingSession, setPendingSessionState] = useState<PendingSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [scheduleRaw, pendingRaw] = await Promise.all([
        storageGetItem(SCHEDULE_STORAGE_KEY),
        storageGetItem(PENDING_SESSION_STORAGE_KEY),
      ]);
      if (cancelled) return;
      if (scheduleRaw) {
        try {
          const parsed = JSON.parse(scheduleRaw) as Partial<StoredSchedule>;
          if (typeof parsed.bedtimeMinutes === 'number') {
            setBedtimeMinutesState(clampMinutes(parsed.bedtimeMinutes));
          }
          if (typeof parsed.wakeMinutes === 'number') {
            setWakeMinutesState(clampMinutes(parsed.wakeMinutes));
          }
        } catch (e) {
          if (__DEV__) console.warn('[AppState] schedule parse failed', e);
        }
      }
      if (pendingRaw) {
        try {
          const parsed = JSON.parse(pendingRaw) as Partial<PendingSession>;
          if (typeof parsed.profileId === 'string' && typeof parsed.startedAt === 'string') {
            setPendingSessionState({
              profileId: parsed.profileId,
              startedAt: parsed.startedAt,
            });
          }
        } catch (e) {
          if (__DEV__) console.warn('[AppState] pending session parse failed', e);
        }
      }
      hydratedRef.current = true;
      if (!cancelled) setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    const payload: StoredSchedule = { bedtimeMinutes, wakeMinutes };
    void storageSetItem(SCHEDULE_STORAGE_KEY, JSON.stringify(payload));
  }, [bedtimeMinutes, wakeMinutes]);

  const setBedtimeMinutes = (m: number) => setBedtimeMinutesState(clampMinutes(m));
  const setWakeMinutes = (m: number) => setWakeMinutesState(clampMinutes(m));

  const setPendingSession = useCallback((session: PendingSession | null) => {
    setPendingSessionState(session);
    if (!hydratedRef.current) return;
    if (session === null) {
      void storageRemoveItem(PENDING_SESSION_STORAGE_KEY);
      return;
    }
    void storageSetItem(PENDING_SESSION_STORAGE_KEY, JSON.stringify(session));
  }, []);

  const clearPendingSession = useCallback(() => {
    setPendingSession(null);
  }, [setPendingSession]);

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
        hydrated,
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
