import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/tokens';
import { findProfile } from '../utils/profiles';
import { useAppState } from '../state/AppState';
import { PatchSimulator } from '../components/PatchSimulator';
import { SmallCapsLabel } from '../components/SmallCapsLabel';
import { PhaseTimelineStrip } from '../components/PhaseTimelineStrip';
import { ProfileCurve } from '../components/ProfileCurve';
import { BottomSheet } from '../components/BottomSheet';
import { PrimaryCTA } from '../components/PrimaryCTA';

const SESSION_HOURS = 8;

export default function LiveScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedProfileId } = useAppState();
  const profile = findProfile(selectedProfileId);

  const [demoMode, setDemoMode] = useState(false);
  const [elapsed, setElapsed] = useState(0.28);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const finishedRef = useRef(false);

  useEffect(() => {
    finishedRef.current = false;
    const id = setInterval(() => {
      setElapsed(e => {
        const speed = demoMode ? 0.002 : 0.00003;
        const next = e + speed;
        if (next >= 1) {
          if (!finishedRef.current) {
            finishedRef.current = true;
            router.replace('/debrief' as never);
          }
          return 1;
        }
        return next;
      });
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.timeText}>{nowTime}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {demoMode && (
            <View style={styles.demoBadge}>
              <SmallCapsLabel style={{ color: colors.accent }}>60× Demo</SmallCapsLabel>
            </View>
          )}
          <Pressable onPress={() => setDemoMode(d => !d)} style={styles.modeBtn}>
            <Text style={styles.modeBtnText}>{demoMode ? 'LIVE' : 'DEMO'}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.heroWrap}>
        <PatchSimulator dose={currentDose} isActive size={230} onPress={() => setSheetOpen(true)} />
        <View style={{ alignItems: 'center', marginTop: 32 }}>
          <SmallCapsLabel style={{ marginBottom: 8 }}>Now</SmallCapsLabel>
          <Text style={styles.phaseName}>{currentPhase.name}</Text>
          {nextPhase ? (
            <Text style={styles.nextPhase}>{nextPhase.name} in {timeRemaining}</Text>
          ) : (
            <Text style={[styles.nextPhase, { color: colors.accent }]}>Final phase</Text>
          )}
        </View>
      </View>

      <View style={[styles.timelineWrap, { paddingBottom: 36 + insets.bottom }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <SmallCapsLabel>10:30 PM</SmallCapsLabel>
          <SmallCapsLabel>6:30 AM</SmallCapsLabel>
        </View>
        <PhaseTimelineStrip phases={profile.phases} currentIdx={currentPhaseIdx} phaseProgress={phaseProgress} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <SmallCapsLabel>{profile.phases.map(p => p.name.split(' ')[0]).join(' · ')}</SmallCapsLabel>
          <Pressable
            onLongPress={() => setCancelConfirm(true)}
            delayLongPress={700}
            hitSlop={6}
          >
            <Text style={styles.cancelHint}>HOLD TO CANCEL</Text>
          </Pressable>
        </View>
      </View>

      <Modal visible={cancelConfirm} transparent animationType="fade" onRequestClose={() => setCancelConfirm(false)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Cancel session?</Text>
            <Text style={styles.confirmBody}>
              Stopping the patch early will end tonight&apos;s delivery profile. You&apos;ll still be prompted for a morning debrief.
            </Text>
            <PrimaryCTA
              label="Stop Session"
              onPress={() => {
                setCancelConfirm(false);
                router.replace('/debrief' as never);
              }}
              style={{ backgroundColor: 'rgba(220,60,60,0.85)', borderColor: 'rgba(255,120,120,0.3)' }}
            />
            <Pressable onPress={() => setCancelConfirm(false)} style={{ paddingVertical: 14, alignItems: 'center', marginTop: 4 }}>
              <Text style={{ color: colors.textSec, fontFamily: 'Inter_400Regular', fontSize: 15 }}>Keep Running</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <BottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)}>
        <SmallCapsLabel style={{ marginBottom: 20 }}>Session Detail</SmallCapsLabel>
        <View style={{ flexDirection: 'row' }}>
          {[
            ['Intensity', `${intensityPct}%`],
            ['Phase', `${currentPhaseIdx + 1} / ${profile.phases.length}`],
            ['Elapsed', `${Math.round(elapsed * SESSION_HOURS * 60)}m`],
          ].map(([label, val], i) => (
            <View
              key={i}
              style={{
                flex: 1,
                alignItems: 'center',
                borderRightWidth: i < 2 ? StyleSheet.hairlineWidth : 0,
                borderRightColor: colors.border,
              }}
            >
              <SmallCapsLabel style={{ marginBottom: 6 }}>{label}</SmallCapsLabel>
              <Text style={styles.sheetStat}>{val}</Text>
            </View>
          ))}
        </View>
        <View style={{ marginTop: 24 }}>
          <SmallCapsLabel style={{ marginBottom: 12 }}>Delivery Profile</SmallCapsLabel>
          <ProfileCurve keyframes={profile.keyframes} width={330} height={90} showLabels={false} currentT={elapsed} />
        </View>
        <View style={{ marginTop: 20 }}>
          <SmallCapsLabel style={{ marginBottom: 8 }}>Tonight&apos;s Profile</SmallCapsLabel>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 18, color: colors.text }}>{profile.name}</Text>
          <Text style={{ marginTop: 3, fontSize: 13, color: colors.textSec, fontFamily: 'Inter_400Regular' }}>
            {profile.rationale}
          </Text>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  timeText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textTer, fontVariant: ['tabular-nums'] },
  demoBadge: {
    backgroundColor: colors.accentDim,
    borderWidth: 1,
    borderColor: colors.accentMid,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  modeBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  modeBtnText: {
    fontFamily: 'Inter_600SemiBold',
    color: colors.textTer,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  heroWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 0 },
  phaseName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 38,
    color: colors.text,
    letterSpacing: -0.8,
  },
  nextPhase: { marginTop: 8, fontSize: 14, color: colors.textSec, fontFamily: 'Inter_400Regular' },
  timelineWrap: { paddingHorizontal: 24 },
  cancelHint: {
    fontFamily: 'Inter_600SemiBold',
    color: 'rgba(255,80,80,0.5)',
    fontSize: 11,
    letterSpacing: 0.7,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  confirmCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 28,
  },
  confirmTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 22, color: colors.text, marginBottom: 8 },
  confirmBody: { fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textSec, lineHeight: 22, marginBottom: 24 },
  sheetStat: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 28,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
});
