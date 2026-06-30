import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState as RNAppState, type AppStateStatus } from 'react-native';
import type { SkyAnchor, ThemeColors } from './circadianPalettes';
import { NIGHT_COLORS } from './circadianPalettes';
import { getCircadianSnapshot, type CircadianSnapshot } from './circadianSchedule';
import {
  dateFromMinutesSinceMidnight,
  minutesSinceMidnight,
} from '../domain/sleepSchedule';

const WALL_TICK_MS = 60_000;
const DEMO_TICK_MS = 100;
const SESSION_MS = 8 * 60 * 60 * 1000;
export const DEMO_FULL_SESSION_SECONDS = 60;
const DEMO_TIME_SPEED_MULTIPLIER = SESSION_MS / (DEMO_FULL_SESSION_SECONDS * 1000);

export type CircadianThemeValue = CircadianSnapshot & {
  appNow: Date;
};

const defaultSnapshot = getCircadianSnapshot(new Date());
const defaultValue: CircadianThemeValue = { ...defaultSnapshot, appNow: new Date() };

const CircadianCtx = createContext<CircadianThemeValue>(defaultValue);

export type CircadianDevControls = {
  usesDeviceClock: boolean;
  followDeviceClock: () => void;
  setSimulatedMinutes: (minutes: number) => void;
  bumpSimulatedMinutes: (delta: number) => void;
  demoAccelerating: boolean;
  setDemoAccelerating: (enabled: boolean) => void;
};

const CircadianDevCtx = createContext<CircadianDevControls | null>(null);

function snapshotAt(now: Date): CircadianSnapshot {
  return getCircadianSnapshot(now);
}

export function CircadianThemeProvider({ children }: { children: React.ReactNode }) {
  const [simulatedAt, setSimulatedAt] = useState<Date | null>(null);
  const [demoAccelerating, setDemoAcceleratingState] = useState(false);
  const [appNow, setAppNow] = useState(() => new Date());

  const followDeviceClock = useCallback(() => {
    setDemoAcceleratingState(false);
    setSimulatedAt(null);
    setAppNow(new Date());
  }, []);

  const setSimulatedMinutes = useCallback((minutes: number) => {
    setDemoAcceleratingState(false);
    const next = dateFromMinutesSinceMidnight(minutes, simulatedAt ?? new Date());
    setSimulatedAt(next);
    setAppNow(next);
  }, [simulatedAt]);

  const bumpSimulatedMinutes = useCallback((delta: number) => {
    setDemoAcceleratingState(false);
    const base = simulatedAt ?? new Date();
    const nextMin = minutesSinceMidnight(base) + delta;
    const next = dateFromMinutesSinceMidnight(nextMin, base);
    setSimulatedAt(next);
    setAppNow(next);
  }, [simulatedAt]);

  const setDemoAccelerating = useCallback((enabled: boolean) => {
    if (enabled) {
      setSimulatedAt((prev) => prev ?? new Date());
    }
    setDemoAcceleratingState(enabled);
  }, []);

  useEffect(() => {
    if (__DEV__ && (simulatedAt !== null || demoAccelerating)) return;

    const tick = () => setAppNow(new Date());
    tick();
    const id = setInterval(tick, WALL_TICK_MS);
    const sub = RNAppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') tick();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [simulatedAt, demoAccelerating]);

  useEffect(() => {
    if (!__DEV__ || demoAccelerating || simulatedAt === null) return;
    setAppNow(simulatedAt);
  }, [simulatedAt, demoAccelerating]);

  useEffect(() => {
    if (!__DEV__ || !demoAccelerating) return;

    let last = Date.now();
    const id = setInterval(() => {
      const wall = Date.now();
      const delta = wall - last;
      last = wall;
      setSimulatedAt((prev) => {
        const base = prev ?? new Date(wall);
        const next = new Date(base.getTime() + delta * DEMO_TIME_SPEED_MULTIPLIER);
        setAppNow(next);
        return next;
      });
    }, DEMO_TICK_MS);

    return () => clearInterval(id);
  }, [demoAccelerating]);

  const snapshot = useMemo(() => snapshotAt(appNow), [appNow]);

  const value = useMemo<CircadianThemeValue>(
    () => ({ ...snapshot, appNow }),
    [snapshot, appNow],
  );

  const usesDeviceClock = simulatedAt === null && !demoAccelerating;

  const devValue = useMemo<CircadianDevControls | null>(
    () =>
      __DEV__
        ? {
            usesDeviceClock,
            followDeviceClock,
            setSimulatedMinutes,
            bumpSimulatedMinutes,
            demoAccelerating,
            setDemoAccelerating,
          }
        : null,
    [
      usesDeviceClock,
      followDeviceClock,
      setSimulatedMinutes,
      bumpSimulatedMinutes,
      demoAccelerating,
      setDemoAccelerating,
    ],
  );

  return (
    <CircadianDevCtx.Provider value={devValue}>
      <CircadianCtx.Provider value={value}>{children}</CircadianCtx.Provider>
    </CircadianDevCtx.Provider>
  );
}

export function useCircadianTheme(): CircadianThemeValue {
  return useContext(CircadianCtx);
}

export function useAppNow(): Date {
  return useCircadianTheme().appNow;
}

export function useCircadianColors(): ThemeColors {
  return useCircadianTheme().colors;
}

export function useCircadianSky(): SkyAnchor {
  return useCircadianTheme().sky;
}

export function useCircadianDev(): CircadianDevControls | null {
  const dev = useContext(CircadianDevCtx);
  if (!__DEV__) return null;
  return dev;
}

export { NIGHT_COLORS };
