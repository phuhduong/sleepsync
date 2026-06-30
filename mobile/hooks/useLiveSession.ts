import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useAppNow } from '../theme/CircadianThemeProvider';
import { useAppState } from '../state/AppState';
import { useTonightPlan } from '../state/TonightPlanContext';
import { computeEngineSnapshot } from '../domain/profileEngine';
import { OFFLINE_PROFILE, type Phase, type Profile } from '../domain/profiles';
import { getPatchTransport } from '../services/patchTransport';
import { getPatchBleClient } from '../ble/getPatchBleClient';
import { createPatchSession } from '../services/patchSession';
import {
  formatDateAsClock,
  formatMinutesAsTime12h,
  clockMinutesFromDate,
} from '../domain/sleepSchedule';
import {
  formatDurationMinutes,
  minutesSinceBed,
  minutesUntilBed,
  resolveActiveSleepWindow,
  type SleepWindow,
} from '../domain/sleepWindow';
import { usePatchBle } from './usePatchBle';
import { canStartPatchSession, resolveBleEnabled } from '../ble/bleConfig';

const HOLD_CANCEL_MS = 900;

export function useLiveSession() {
  useKeepAwake();
  const router = useRouter();
  const appNow = useAppNow();
  const { connected: patchConnected, connect: reconnectPatch, enabled: bleEnabled } =
    usePatchBle();

  const { bedtimeMinutes, wakeMinutes, setPendingSession } = useAppState();
  const { plan: tonightPlan, nightId } = useTonightPlan();

  const profile: Profile = tonightPlan?.profile ?? OFFLINE_PROFILE;

  const scheduleKey = `${bedtimeMinutes}:${wakeMinutes}`;
  const sleepWindowLatch = useRef<{ key: string; window: SleepWindow } | null>(null);
  if (
    sleepWindowLatch.current === null ||
    sleepWindowLatch.current.key !== scheduleKey
  ) {
    sleepWindowLatch.current = {
      key: scheduleKey,
      window: resolveActiveSleepWindow(appNow, bedtimeMinutes, wakeMinutes),
    };
  }
  const sleepWindow = sleepWindowLatch.current.window;

  const patchSessionRef = useRef(
    createPatchSession({
      transport: getPatchTransport(),
      client: resolveBleEnabled() ? getPatchBleClient() : null,
    }),
  );

  const bleRequired = resolveBleEnabled();
  const enteredRef = useRef(false);

  useEffect(() => {
    if (enteredRef.current) return;
    enteredRef.current = true;
    if (bleRequired && !canStartPatchSession(patchConnected)) {
      router.replace('/' as never);
    }
  }, [bleRequired, patchConnected, router]);

  const pendingSessionSet = useRef(false);
  useEffect(() => {
    if (bleRequired && !canStartPatchSession(patchConnected)) return;
    if (pendingSessionSet.current) return;
    pendingSessionSet.current = true;
    setPendingSession({ profileId: profile.id, startedAt: appNow.toISOString() });
  }, [profile.id, appNow, setPendingSession, patchConnected, bleRequired]);

  const [scheduleOnPatch, setScheduleOnPatch] = useState(false);
  useEffect(() => {
    if (!patchConnected || scheduleOnPatch) return;
    void patchSessionRef.current
      .arm(sleepWindow, appNow, profile.keyframes)
      .then((armed) => {
        if (armed) setScheduleOnPatch(true);
      });
  }, [patchConnected, scheduleOnPatch, sleepWindow, appNow, profile.keyframes]);

  const transport = getPatchTransport();
  useEffect(() => {
    transport.startDeliveryFlush(nightId);
    return () => transport.stopDeliveryFlush();
  }, [nightId, transport]);

  const snapshot = computeEngineSnapshot({ profile, sleepWindow, now: appNow });
  const {
    t: elapsed,
    dose: currentDose,
    phaseIdx: currentPhaseIdx,
    phaseProgress,
    beforeBed,
    sessionEnded,
  } = snapshot;

  const finishedRef = useRef(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const goToDebrief = useCallback(() => {
    void patchSessionRef.current.end(nightId).finally(() => {
      router.replace('/debrief' as never);
    });
  }, [nightId, router]);

  useEffect(() => {
    if (!sessionEnded || finishedRef.current) return;
    finishedRef.current = true;
    goToDebrief();
  }, [sessionEnded, goToDebrief]);

  useEffect(() => {
    patchSessionRef.current.tick({
      t: elapsed,
      dose: currentDose,
      phaseId: profile.phases[currentPhaseIdx]?.id,
      at: appNow,
    });
  }, [elapsed, currentDose, currentPhaseIdx, profile.phases, appNow]);

  const currentPhase = profile.phases[currentPhaseIdx]!;
  const nextPhase = profile.phases[currentPhaseIdx + 1];
  const timeRemaining = useMemo(() => {
    if (!nextPhase) return null;
    if (beforeBed) {
      return `${formatDurationMinutes(minutesUntilBed(appNow, sleepWindow))} until bed`;
    }
    let cumulative = 0;
    for (let i = 0; i <= currentPhaseIdx; i++) cumulative += profile.phases[i]!.duration;
    const remainingProfile = Math.max(0, cumulative - elapsed);
    const remainingMin = (remainingProfile * sleepWindow.durationMs) / 60_000;
    return formatDurationMinutes(remainingMin);
  }, [
    nextPhase,
    beforeBed,
    appNow,
    sleepWindow,
    currentPhaseIdx,
    profile.phases,
    elapsed,
  ]);

  const inOpacity = useRef(new Animated.Value(1)).current;
  const outOpacity = useRef(new Animated.Value(0)).current;
  const holdProgress = useRef(new Animated.Value(0)).current;
  const lastPhaseIdxRef = useRef(currentPhaseIdx);
  const [outgoingPhase, setOutgoingPhase] = useState<Phase | null>(null);

  useEffect(() => {
    if (lastPhaseIdxRef.current === currentPhaseIdx) return;
    setOutgoingPhase(profile.phases[lastPhaseIdxRef.current] ?? null);
    lastPhaseIdxRef.current = currentPhaseIdx;
    inOpacity.setValue(0);
    outOpacity.setValue(1);
    Animated.parallel([
      Animated.timing(inOpacity, {
        toValue: 1,
        duration: 1500,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(outOpacity, {
        toValue: 0,
        duration: 1500,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setOutgoingPhase(null);
    });
  }, [currentPhaseIdx, profile.phases, inOpacity, outOpacity]);

  const cancelHoldStart = () => {
    holdProgress.stopAnimation();
    holdProgress.setValue(0);
    Animated.timing(holdProgress, {
      toValue: 1,
      duration: HOLD_CANCEL_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) setCancelConfirm(true);
      holdProgress.setValue(0);
    });
  };

  const cancelHoldEnd = () => {
    holdProgress.stopAnimation();
    holdProgress.setValue(0);
  };

  return {
    profile,
    elapsed,
    currentDose,
    currentPhaseIdx,
    phaseProgress,
    beforeBed,
    currentPhase,
    nextPhase,
    timeRemaining,
    nowTime: formatDateAsClock(appNow),
    intensityPct: Math.round(currentDose * 100),
    sheetOpen,
    setSheetOpen,
    cancelConfirm,
    setCancelConfirm,
    outgoingPhase,
    inOpacity,
    outOpacity,
    holdProgress,
    cancelHoldStart,
    cancelHoldEnd,
    goToDebrief,
    bleDisconnected: bleEnabled && !patchConnected,
    patchAutonomous: scheduleOnPatch && !patchConnected,
    reconnectPatch,
    bedtimeLabel: formatMinutesAsTime12h(clockMinutesFromDate(sleepWindow.bedtime)),
    wakeLabel: formatMinutesAsTime12h(clockMinutesFromDate(sleepWindow.wake)),
    minutesUntilBed: minutesUntilBed(appNow, sleepWindow),
    minutesSinceBed: minutesSinceBed(appNow, sleepWindow),
  };
}
