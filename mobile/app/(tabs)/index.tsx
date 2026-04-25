import { View, Text, StyleSheet, useWindowDimensions, Pressable } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { colors } from '../../theme/tokens';
import { findProfile, history } from '../../utils/profiles';
import { useAppState } from '../../state/AppState';
import { BackgroundCanvas } from '../../components/BackgroundCanvas';
import { SmallCapsLabel } from '../../components/SmallCapsLabel';
import { ProfileCurve } from '../../components/ProfileCurve';
import { PrimaryCTA } from '../../components/PrimaryCTA';

const formatTime = (d: Date) =>
  d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
const formatDate = (d: Date) =>
  d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { selectedProfileId, isFirstTime } = useAppState();
  const profile = findProfile(selectedProfileId);

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <BackgroundCanvas width={width} height={height} />

      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.brand}>sleepsync</Text>
        <Text style={styles.timeStamp}>{formatTime(now)} · {formatDate(now)}</Text>
      </View>

      <View style={styles.hero}>
        <View style={styles.pillWrap}>
          {isFirstTime ? (
            <View style={[styles.pill, { backgroundColor: 'rgba(123,92,240,0.18)', borderColor: 'rgba(123,92,240,0.3)' }]}>
              <View style={[styles.pillDot, { backgroundColor: colors.accent }]} />
              <SmallCapsLabel style={{ color: colors.accent }}>Welcome · First session</SmallCapsLabel>
            </View>
          ) : (
            <View style={[styles.pill, { backgroundColor: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.1)' }]}>
              <View style={[styles.pillDot, { backgroundColor: 'rgba(245,245,247,0.4)' }]} />
              <SmallCapsLabel>Tonight's plan</SmallCapsLabel>
            </View>
          )}
        </View>

        <Text style={styles.profileName}>{profile.name}</Text>
        <Text style={styles.rationale}>{profile.rationale}</Text>
      </View>

      <BlurView intensity={28} tint="dark" style={[styles.glassCard, { paddingBottom: 28 + insets.bottom }]}>
        <View>
          <View style={styles.timeRow}>
            <View style={{ flex: 1 }}>
              <SmallCapsLabel style={{ marginBottom: 4 }}>Bedtime</SmallCapsLabel>
              <Text style={styles.timeValue}>10:30 PM</Text>
            </View>
            <View style={{ paddingHorizontal: 8 }}>
              <ProfileCurve keyframes={profile.keyframes} width={120} height={44} showLabels={false} mini />
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <SmallCapsLabel style={{ marginBottom: 4 }}>Wake</SmallCapsLabel>
              <Text style={styles.timeValue}>6:30 AM</Text>
            </View>
          </View>

          <Pressable
            onPress={() => router.push('/profile' as never)}
            style={styles.changeRow}
          >
            <Text style={styles.recommendedText}>
              {profile.recommended ? 'Recommended profile' : 'Custom profile'}
            </Text>
            <View style={styles.changeBtn}>
              <Text style={styles.changeBtnText}>CHANGE</Text>
            </View>
          </Pressable>

          {!isFirstTime && history.length > 0 && (
            <View style={styles.lastNightRow}>
              <SmallCapsLabel style={{ width: 72 }}>Last night</SmallCapsLabel>
              <Text style={styles.summaryText}>{history[0].summary}</Text>
              <View
                style={[
                  styles.outcomeGlyph,
                  {
                    backgroundColor: history[0].outcome === 'good' ? colors.accentDim : 'rgba(255,255,255,0.06)',
                  },
                ]}
              >
                <Text style={{
                  color: history[0].outcome === 'good' ? colors.accent : colors.textSec,
                  fontFamily: 'Inter_600SemiBold',
                  fontSize: 11,
                }}>{history[0].outcome === 'good' ? '✓' : '–'}</Text>
              </View>
            </View>
          )}
        </View>

        <PrimaryCTA label="Apply Patch Tonight" onPress={() => router.push('/live' as never)} />
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 2,
  },
  brand: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    letterSpacing: -0.3,
    color: 'rgba(245,245,247,0.92)',
  },
  timeStamp: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(245,245,247,0.55)',
    fontVariant: ['tabular-nums'],
  },
  hero: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 26,
    paddingBottom: 24,
    paddingTop: 32,
    zIndex: 2,
  },
  pillWrap: { marginBottom: 14, flexDirection: 'row' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  pillDot: { width: 5, height: 5, borderRadius: 2.5 },
  profileName: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 54,
    color: '#F5F5F7',
    letterSpacing: -0.5,
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 24,
    textShadowOffset: { width: 0, height: 2 },
  },
  rationale: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: 'rgba(245,245,247,0.62)',
    lineHeight: 22,
    maxWidth: 310,
  },
  glassCard: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(12,13,18,0.82)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.09)',
    paddingHorizontal: 24,
    paddingTop: 28,
    overflow: 'hidden',
  },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  timeValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 24,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  changeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    paddingBottom: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  recommendedText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textSec },
  changeBtn: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  changeBtnText: {
    fontFamily: 'Inter_600SemiBold',
    color: colors.textSec,
    fontSize: 11,
    letterSpacing: 0.7,
  },
  lastNightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
    paddingBottom: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  summaryText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textSec, lineHeight: 18 },
  outcomeGlyph: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
