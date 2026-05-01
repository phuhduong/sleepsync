import { Animated, Easing, View, Text, StyleSheet, Pressable, Modal, useWindowDimensions } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { colors, fonts } from '../theme/tokens';
import { findProfile, type Phase } from '../utils/profiles';
import { formatMinutesAsTime12h, clockMinutesFromDate } from '../utils/sleepSchedule';
import { useAppState } from '../state/AppState';
import { PatchSimulator } from '../components/PatchSimulator';
import { SmallCapsLabel } from '../components/SmallCapsLabel';
import { PhaseTimelineStrip } from '../components/PhaseTimelineStrip';
import { ProfileCurve } from '../components/ProfileCurve';
import { BottomSheet } from '../components/BottomSheet';
import { LiveAmbient } from '../components/LiveAmbient';
import { StatNumber } from '../components/StatNumber';
import { SegmentedControl } from '../components/SegmentedControl';

const SESSION_HOURS = 8;
const SESSION_MS = SESSION_HOURS * 60 * 60 * 1000;

/** Target wall-clock length for a full profile run in demo mode (pitch-friendly). */
const DEMO_FULL_SESSION_SECONDS = 60;
/** Speed multiplier so a full virtual session completes in DEMO_FULL_SESSION_SECONDS of wall clock. */
const DEMO_SPEED_MULTIPLIER = SESSION_MS / (DEMO_FULL_SESSION_SECONDS * 1000);
const HOLD_CANCEL_MS = 900;
const HOLD_BAR_WIDTH = 280;

export default function LiveScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { selectedProfileId, wakeMinutes } = useAppState();
  const profile = findProfile(selectedProfileId);
  const colWidth = Math.min(width, 390);

  /** Wall-clock moment this overnight run began — session timeline is anchored here, not habitual bedtime. */
  const [sessionStartedAt] = useState(() => new Date());

  const [demoMode, setDemoMode] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const finishedRef = useRef(false);
  const virtualSessionMsRef = useRef(0);
  const lastTickRef = useRef(Date.now());

  useEffect(() => {
    finishedRef.current = false;
  }, []);

  useEffect(() => {
    lastTickRef.current = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const deltaMs = now - lastTickRef.current;
      lastTickRef.current = now;
      const rate = demoMode ? DEMO_SPEED_MULTIPLIER : 1;
      virtualSessionMsRef.current += deltaMs * rate;
      const nextElapsed = Math.min(1, virtualSessionMsRef.current / SESSION_MS);
      setElapsed(nextElapsed);
      if (nextElapsed >= 1 && !finishedRef.current) {
        finishedRef.current = true;
        router.replace('/debrief' as never);
      }
    }, 100);
    return () => clearInterval(id);
  }, [demoMode, router]);

  let cumulative = 0;
  let currentPhaseIdx = 0;
  let phaseProgress = 0;
  let currentDose = 0;
  for (let i = 0; i < profile.phases.length; i++) {
    const ph = profile.phases[i];
    if (elapsed < cumulative + ph.duration || i === profile.phases.length - 1) {
      currentPhaseIdx = i;
      phaseProgress = Math.min(1, (elapsed - cumulative) / ph.duration);
      for (let j = 1; j < profile.keyframes.length; j++) {
        if (elapsed <= profile.keyframes[j].t) {
          const a = profile.keyframes[j - 1];
          const b = profile.keyframes[j];
          const f = (elapsed - a.t) / (b.t - a.t);
          currentDose = a.dose + f * (b.dose - a.dose);
          break;
        }
      }
      break;
    }
    cumulative += ph.duration;
  }

  const currentPhase = profile.phases[currentPhaseIdx];
  const nextPhase = profile.phases[currentPhaseIdx + 1];
  const timeRemaining = (() => {
    if (!nextPhase) return null;
    let c2 = 0;
    for (let i = 0; i <= currentPhaseIdx; i++) c2 += profile.phases[i].duration;
    const remaining = (c2 - elapsed) * SESSION_HOURS * 60;
    const h = Math.floor(remaining / 60);
    const m = Math.max(0, Math.round(remaining % 60));
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  })();

  const nowTime = (() => {
    const d = new Date();
    const h = d.getHours();
    const m = d.getMinutes();
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  })();

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
        <View style={{ marginBottom: 14 }}>
          <SmallCapsLabel style={{ marginBottom: 8 }}>Session speed</SmallCapsLabel>
          <SegmentedControl
            options={[
              { value: 'live', label: 'Real-time' },
              { value: 'demo', label: `Demo · ~${DEMO_FULL_SESSION_SECONDS}s` },
            ]}
            value={demoMode ? 'demo' : 'live'}
            onChange={(v) => setDemoMode(v === 'demo')}
          />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <View style={{ flex: 1 }}>
            <SmallCapsLabel style={{ marginBottom: 4 }}>Session start</SmallCapsLabel>
            <Text style={styles.timelineAnchorValue}>
              {formatMinutesAsTime12h(clockMinutesFromDate(sessionStartedAt))}
            </Text>
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <SmallCapsLabel style={{ marginBottom: 4 }}>Usual wake</SmallCapsLabel>
            <Text style={styles.timelineAnchorValue}>{formatMinutesAsTime12h(wakeMinutes)}</Text>
          </View>
        </View>
        <PhaseTimelineStrip phases={profile.phases} currentIdx={currentPhaseIdx} phaseProgress={phaseProgress} />
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
            <BlurView intensity={28} tint="dark" style={styles.confirmGlass}>
              <SmallCapsLabel style={styles.confirmEyebrow}>Tonight · Live session</SmallCapsLabel>
              <Text style={styles.confirmHeading}>End delivery early?</Text>
              <Text style={styles.confirmBody}>
                The patch stops following your overnight profile. You can still open the morning debrief when you&apos;re up.
              </Text>
              <Pressable
                onPress={() => {
                  setCancelConfirm(false);
                  router.replace('/debrief' as never);
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
            </BlurView>
          </View>
        </View>
      </Modal>

      <BottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)}>
        <View style={{ flexDirection: 'row' }}>
          {([
            ['Intensity', `${intensityPct}%`],
            ['Phase', `${currentPhaseIdx + 1} / ${profile.phases.length}`],
            ['Since start', `${Math.round(elapsed * SESSION_HOURS * 60)}m`],
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

const styles = StyleSheet.create({
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
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 22,
    backgroundColor: 'rgba(12,13,18,0.88)',
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
});
