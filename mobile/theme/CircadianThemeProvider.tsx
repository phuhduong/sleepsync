import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState as RNAppState, type AppStateStatus } from 'react-native';
import type { SkyAnchor, ThemeColors } from './circadianPalettes';
import { NIGHT_COLORS } from './circadianPalettes';
import { getCircadianSnapshot, type CircadianSnapshot } from './circadianSchedule';
import {
  dateFromMinutesSinceMidnight,
  minutesSinceMidnight,
} from './simulatedTime';
import { DEMO_TIME_SPEED_MULTIPLIER } from '../utils/sessionDemo';

const WALL_TICK_MS = 60_000;
const DEMO_TICK_MS = 100;

export type CircadianThemeValue = CircadianSnapshot & {
  /** Effective “now” for UI, theme, and Live session math. */
  appNow: Date;
};

const defaultSnapshot = getCircadianSnapshot(new Date());
const defaultValue: CircadianThemeValue = { ...defaultSnapshot, appNow: new Date() };

const CircadianCtx = createContext<CircadianThemeValue>(defaultValue);

export type CircadianDevControls = {
  /** Following the device clock (not scrubbing or fast-forwarding). */
  usesDeviceClock: boolean;
  followDeviceClock: () => void;
  setSimulatedMinutes: (minutes: number) => void;
  bumpSimulatedMinutes: (delta: number) => void;
  /** Advances `appNow` quickly — drives theme, Live profile, and on-screen clock. */
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

  // Device clock — production always; dev when not simulating.
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

  // Dev: frozen scrub — keep theme aligned when simulatedAt changes without fast-forward.
  useEffect(() => {
    if (!__DEV__ || demoAccelerating || simulatedAt === null) return;
    setAppNow(simulatedAt);
  }, [simulatedAt, demoAccelerating]);

  // Dev: fast-forward simulated clock (theme + Live session + Live header clock).
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

/** UI token colors for the current time of day. */
export function useCircadianColors(): ThemeColors {
  return useCircadianTheme().colors;
}

/** Sky RGB 0–1 for the aurora shader. */
export function useCircadianSky(): SkyAnchor {
  return useCircadianTheme().sky;
}

/** Dev-only tools. `null` in production builds. */
export function useCircadianDev(): CircadianDevControls | null {
  const dev = useContext(CircadianDevCtx);
  if (!__DEV__) return null;
  return dev;
}

export { NIGHT_COLORS };
