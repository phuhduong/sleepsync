import { Animated, Easing, View, Text, StyleSheet, Pressable, Modal, useWindowDimensions } from 'react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassPanel } from '../components/GlassPanel';
import { fonts } from '../theme/tokens';
import { useAppNow, useCircadianColors } from '../theme/CircadianThemeProvider';
import { formatDateAsClock } from '../theme/simulatedTime';
import { OFFLINE_FALLBACK_PROFILE_ID, findProfile, type Phase } from '../utils/profiles';
import { formatMinutesAsTime12h, clockMinutesFromDate } from '../utils/sleepSchedule';
import type { SleepWindow } from '../utils/sleepWindow';
import {
  formatDurationMinutes,
  isInActiveSleepWindow,
  minutesSinceBed,
  minutesUntilBed,
  resolveActiveSleepWindow,
} from '../utils/sleepWindow';
import { computeEngineSnapshot } from '../utils/profileEngine';
import { flushDeliveryLog } from '../utils/flushDeliveryLog';
import { getPatchTransport } from '../utils/patchTransportInstance';
import { useAppState } from '../state/AppState';
import { PatchSimulator } from '../components/PatchSimulator';
import { SmallCapsLabel } from '../components/SmallCapsLabel';
import { PhaseTimelineStrip } from '../components/PhaseTimelineStrip';
import { ProfileCurve } from '../components/ProfileCurve';
import { BottomSheet } from '../components/BottomSheet';
import { LiveAmbient } from '../components/LiveAmbient';
import { StatNumber } from '../components/StatNumber';
const HOLD_CANCEL_MS = 900;
const HOLD_BAR_WIDTH = 280;

export default function LiveScreen() {
  const colors = useCircadianColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        column: {
          flex: 1,
          width: '100%',
          maxWidth: 390,
          alignSelf: 'center',
        },
        topBar: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 24,
          paddingBottom: 12,
        },
        timeText: {
          fontFamily: fonts.body,
          fontSize: 14,
          color: colors.textSec,
          fontVariant: ['tabular-nums'],
        },
        timelineAnchorValue: {
          fontFamily: fonts.bodyS,
          fontSize: 15,
          color: colors.text,
          fontVariant: ['tabular-nums'],
        },
        heroWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 0 },
        phaseBlock: {
          alignItems: 'center',
          marginTop: 32,
          minHeight: 110,
          alignSelf: 'stretch',
        },
        phaseLayer: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          alignItems: 'center',
        },
        phaseName: {
          fontFamily: fonts.hero,
          fontSize: 44,
          color: colors.text,
          letterSpacing: -0.5,
        },
        nextPhase: { marginTop: 8, fontSize: 14, color: colors.textSec, fontFamily: fonts.body },
        timelineWrap: { paddingHorizontal: 24 },
        holdCancelPress: {
          marginTop: 20,
          alignItems: 'center',
          alignSelf: 'stretch',
          paddingVertical: 12,
        },
        holdTrack: {
          width: HOLD_BAR_WIDTH,
          height: 3,
          borderRadius: 2,
          backgroundColor: 'rgba(255,255,255,0.08)',
          overflow: 'hidden',
          marginBottom: 10,
        },
        holdFill: {
          height: '100%',
          borderRadius: 2,
          backgroundColor: colors.dangerDim,
        },
        cancelHint: {
          fontFamily: fonts.bodyM,
          color: colors.dangerDim,
          fontSize: 11,
          letterSpacing: 0.7,
        },
        confirmRoot: {
          flex: 1,
        },
        confirmDim: {
          backgroundColor: 'rgba(7,8,12,0.82)',
        },
        confirmCenter: {
          flex: 1,
          justifyContent: 'center',
          paddingHorizontal: 24,
        },
        confirmGlass: {
          width: '100%',
          maxWidth: 390,
          alignSelf: 'center',
          paddingHorizontal: 28,
          paddingTop: 28,
          paddingBottom: 22,
        },
        confirmEyebrow: {
          marginBottom: 12,
          color: colors.textTer,
        },
        confirmHeading: {
          fontFamily: fonts.hero,
          fontSize: 34,
          lineHeight: 38,
          letterSpacing: -0.6,
          color: colors.text,
          marginBottom: 12,
        },
        confirmBody: {
          fontFamily: fonts.body,
          fontSize: 15,
          lineHeight: 23,
          color: colors.textSec,
          marginBottom: 22,
        },
        confirmDangerCta: {
          width: '100%',
          borderRadius: 999,
          backgroundColor: colors.danger,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.dangerDim,
          paddingVertical: 14,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 48,
        },
        confirmDangerLabel: {
          fontFamily: fonts.bodyS,
          fontSize: 16,
          letterSpacing: 0.2,
          color: 'rgba(245,245,247,0.95)',
        },
        confirmSecondary: {
          alignItems: 'center',
          paddingVertical: 16,
          marginTop: 4,
        },
        confirmSecondaryLabel: {
          fontFamily: fonts.body,
          fontSize: 14,
          color: colors.textTer,
          letterSpacing: 0.2,
        },
      }),
    [colors],
  );
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const {
    bedtimeMinutes,
    wakeMinutes,
    pendingSession,
    setPendingSession,
    tonightPlan,
    nightId,
  } = useAppState();
  /** Backend-generated profile, or standard maintenance when offline. */
  const profile = tonightPlan?.profile ?? findProfile(OFFLINE_FALLBACK_PROFILE_ID);
  const colWidth = Math.min(width, 390);
  const appNow = useAppNow();

  /** Latch bed→wake for this visit so passing wake does not jump to "next night" (t → 0 loop). */
  const sleepWindowLatch = useRef<SleepWindow | null>(null);
  if (sleepWindowLatch.current === null) {
    sleepWindowLatch.current = resolveActiveSleepWindow(
      appNow,
      bedtimeMinutes,
      wakeMinutes,
    );
  }
  const sleepWindow = sleepWindowLatch.current;

  const inSleepWindow = isInActiveSleepWindow(appNow, bedtimeMinutes, wakeMinutes);
  const startedBeforeBed =
    pendingSession !== null &&
    new Date(pendingSession.startedAt).getTime() <= sleepWindow.bedtime.getTime();

  useEffect(() => {
    if (inSleepWindow && !startedBeforeBed) {
      router.replace('/' as never);
    }
  }, [inSleepWindow, startedBeforeBed, router]);

  const pendingSessionSet = useRef(false);
  useEffect(() => {
    if (inSleepWindow && !startedBeforeBed) return;
    if (pendingSessionSet.current) return;
    pendingSessionSet.current = true;
    setPendingSession({
      profileId: profile.id,
      startedAt: appNow.toISOString(),
    });
  }, [
    profile.id,
    appNow,
    setPendingSession,
    inSleepWindow,
    startedBeforeBed,
  ]);

  /** Engine snapshot (t, dose, phase, etc.) — replaces inline loop. */
  const snapshot = computeEngineSnapshot({ profile, sleepWindow, now: appNow });
  const { t: elapsed, dose: currentDose, phaseIdx: currentPhaseIdx, phaseProgress, beforeBed, sessionEnded } = snapshot;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const finishedRef = useRef(false);

  useEffect(() => {
    finishedRef.current = false;
  }, []);

  const goToDebrief = () => {
    void flushDeliveryLog(getPatchTransport(), nightId).finally(() => {
      router.replace('/debrief' as never);
    });
  };

  useEffect(() => {
    if (!sessionEnded || finishedRef.current) return;
    finishedRef.current = true;
    goToDebrief();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionEnded]);

  const transport = getPatchTransport();
  useEffect(() => {
    transport.pushSnapshot({
      t: elapsed,
      dose: currentDose,
      phaseId: profile.phases[currentPhaseIdx]?.id,
      at: appNow,
    });
  }, [elapsed, currentDose, currentPhaseIdx, profile.phases, appNow, transport]);

  const currentPhase = profile.phases[currentPhaseIdx];
  const nextPhase = profile.phases[currentPhaseIdx + 1];
  const timeRemaining = (() => {
    if (!nextPhase) return null;
    if (beforeBed) {
      return `${formatDurationMinutes(minutesUntilBed(appNow, sleepWindow))} until bed`;
    }
    let c2 = 0;
    for (let i = 0; i <= currentPhaseIdx; i++) c2 += profile.phases[i].duration;
    const remainingProfile = Math.max(0, c2 - elapsed);
    const remainingMin = (remainingProfile * sleepWindow.durationMs) / 60_000;
    return formatDurationMinutes(remainingMin);
  })();

  const nowTime = formatDateAsClock(appNow);

  const intensityPct = Math.round(currentDose * 100);

  const inOpacity = useRef(new Animated.Value(1)).current;
  const outOpacity = useRef(new Animated.Value(0)).current;
  const holdProgress = useRef(new Animated.Value(0)).current;
  const lastPhaseIdxRef = useRef(currentPhaseIdx);
  const [outgoingPhase, setOutgoingPhase] = useState<Phase | null>(null);
  useEffect(() => {
    if (lastPhaseIdxRef.current === currentPhaseIdx) return;
    setOutgoingPhase(profile.phases[lastPhaseIdxRef.current]);
    lastPhaseIdxRef.current = currentPhaseIdx;
    inOpacity.setValue(0);
    outOpacity.setValue(1);
    Animated.parallel([
      Animated.timing(inOpacity,  { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.timing(outOpacity, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setOutgoingPhase(null);
    });
  }, [currentPhaseIdx, profile.phases, inOpacity, outOpacity]);

  // Phase progress is consumed by PhaseTimelineStrip — re-export for clarity.
  const _phaseProgress = phaseProgress;

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

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.column}>
      <LiveAmbient width={colWidth} height={height} />
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.timeText}>{nowTime}</Text>
      </View>

      <View style={styles.heroWrap}>
        <PatchSimulator dose={currentDose} isActive size={230} onPress={() => setSheetOpen(true)} />
        <View style={styles.phaseBlock}>
          {outgoingPhase && (
            <Animated.View style={[styles.phaseLayer, { opacity: outOpacity }]}>
              <SmallCapsLabel style={{ marginBottom: 8 }}>Now</SmallCapsLabel>
              <Text style={styles.phaseName}>{outgoingPhase.name}</Text>
            </Animated.View>
          )}
          <Animated.View style={[styles.phaseLayer, { opacity: inOpacity }]}>
            <SmallCapsLabel style={{ marginBottom: 8 }}>Now</SmallCapsLabel>
            <Text style={styles.phaseName}>{currentPhase.name}</Text>
            {nextPhase ? (
              <Text style={styles.nextPhase}>{nextPhase.name} in {timeRemaining}</Text>
            ) : (
              <Text style={[styles.nextPhase, { color: colors.accent }]}>Final phase</Text>
            )}
          </Animated.View>
        </View>
      </View>

      <View style={[styles.timelineWrap, { paddingBottom: 36 + insets.bottom }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <View style={{ flex: 1 }}>
            <SmallCapsLabel style={{ marginBottom: 4 }}>Bedtime</SmallCapsLabel>
            <Text style={styles.timelineAnchorValue}>
              {formatMinutesAsTime12h(clockMinutesFromDate(sleepWindow.bedtime))}
            </Text>
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <SmallCapsLabel style={{ marginBottom: 4 }}>Usual wake</SmallCapsLabel>
            <Text style={styles.timelineAnchorValue}>
              {formatMinutesAsTime12h(clockMinutesFromDate(sleepWindow.wake))}
            </Text>
          </View>
        </View>
        <PhaseTimelineStrip phases={profile.phases} currentIdx={currentPhaseIdx} phaseProgress={_phaseProgress} />
        <Pressable
          onPressIn={cancelHoldStart}
          onPressOut={cancelHoldEnd}
          style={styles.holdCancelPress}
          accessibilityRole="button"
          accessibilityLabel="Hold to cancel session"
        >
          <View style={styles.holdTrack}>
            <Animated.View
              style={[
                styles.holdFill,
                {
                  width: holdProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, HOLD_BAR_WIDTH],
                  }),
                },
              ]}
            />
          </View>
          <Text style={styles.cancelHint}>HOLD TO CANCEL SESSION</Text>
        </Pressable>
      </View>
      </View>

      <Modal visible={cancelConfirm} transparent animationType="fade" onRequestClose={() => setCancelConfirm(false)}>
        <View style={styles.confirmRoot}>
          <Pressable
            style={[StyleSheet.absoluteFillObject, styles.confirmDim]}
            onPress={() => setCancelConfirm(false)}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
          />
          <View
            style={[
              styles.confirmCenter,
              { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 20) },
            ]}
            pointerEvents="box-none"
          >
            <GlassPanel variant="modal" padded={false} style={styles.confirmGlass}>
              <SmallCapsLabel style={styles.confirmEyebrow}>Tonight · Live session</SmallCapsLabel>
              <Text style={styles.confirmHeading}>End delivery early?</Text>
              <Text style={styles.confirmBody}>
                The patch stops following your overnight profile. You can still open the morning debrief when you&apos;re up.
              </Text>
              <Pressable
                onPress={() => {
                  setCancelConfirm(false);
                  goToDebrief();
                }}
                style={({ pressed }) => [styles.confirmDangerCta, pressed && { opacity: 0.92 }]}
                accessibilityRole="button"
                accessibilityLabel="Stop session and go to debrief"
              >
                <Text style={styles.confirmDangerLabel}>Stop & debrief</Text>
              </Pressable>
              <Pressable
                onPress={() => setCancelConfirm(false)}
                style={styles.confirmSecondary}
                hitSlop={10}
                accessibilityRole="button"
              >
                <Text style={styles.confirmSecondaryLabel}>Keep tonight&apos;s session running</Text>
              </Pressable>
            </GlassPanel>
          </View>
        </View>
      </Modal>

      <BottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)}>
        <View style={{ flexDirection: 'row' }}>
          {([
            ['Intensity', `${intensityPct}%`],
            ['Phase', `${currentPhaseIdx + 1} / ${profile.phases.length}`],
            [
              beforeBed ? 'Until bed' : 'Since bed',
              beforeBed
                ? `${minutesUntilBed(appNow, sleepWindow)}m`
                : `${minutesSinceBed(appNow, sleepWindow)}m`,
            ],
          ] as const).map(([label, val], i) => (
            <View
              key={label}
              style={{
                flex: 1,
                borderRightWidth: i < 2 ? StyleSheet.hairlineWidth : 0,
                borderRightColor: colors.border,
              }}
            >
              <StatNumber value={val} label={label} size={44} />
            </View>
          ))}
        </View>
        <View style={{ marginTop: 28 }}>
          <SmallCapsLabel style={{ marginBottom: 12 }}>Delivery Profile</SmallCapsLabel>
          <ProfileCurve keyframes={profile.keyframes} width={330} height={90} currentT={elapsed} />
        </View>
      </BottomSheet>
    </View>
  );
}
