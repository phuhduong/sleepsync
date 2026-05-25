import { createContext, useCallback, useContext, useState } from 'react';
import {
  DEFAULT_BEDTIME_MINUTES,
  DEFAULT_WAKE_MINUTES,
  clampMinutes,
} from '../utils/sleepSchedule';

export type PendingSession = {
  profileId: string;
  startedAt: string;
};

type AppState = {
  selectedProfileId: string;
  setSelectedProfileId: (id: string) => void;
  isFirstTime: boolean;
  setIsFirstTime: (v: boolean) => void;
  bedtimeMinutes: number;
  setBedtimeMinutes: (m: number) => void;
  wakeMinutes: number;
  setWakeMinutes: (m: number) => void;
  pendingSession: PendingSession | null;
  setPendingSession: (session: PendingSession | null) => void;
  clearPendingSession: () => void;
};

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [selectedProfileId, setSelectedProfileId] = useState('standard');
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [bedtimeMinutes, setBedtimeMinutesState] = useState(DEFAULT_BEDTIME_MINUTES);
  const [wakeMinutes, setWakeMinutesState] = useState(DEFAULT_WAKE_MINUTES);
  const [pendingSession, setPendingSessionState] = useState<PendingSession | null>(null);

  const setBedtimeMinutes = (m: number) => setBedtimeMinutesState(clampMinutes(m));
  const setWakeMinutes = (m: number) => setWakeMinutesState(clampMinutes(m));

  const setPendingSession = useCallback((session: PendingSession | null) => {
    setPendingSessionState(session);
  }, []);

  const clearPendingSession = useCallback(() => {
    setPendingSessionState(null);
  }, []);

  return (
    <Ctx.Provider
      value={{
        selectedProfileId,
        setSelectedProfileId,
        isFirstTime,
        setIsFirstTime,
        bedtimeMinutes,
        setBedtimeMinutes,
        wakeMinutes,
        setWakeMinutes,
        pendingSession,
        setPendingSession,
        clearPendingSession,
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
