import { ScrollView, View, Text, StyleSheet, Pressable } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme/tokens';
import { profiles } from '../../utils/profiles';
import { useAppState } from '../../state/AppState';
import { SmallCapsLabel } from '../../components/SmallCapsLabel';
import { ProfileCurve } from '../../components/ProfileCurve';
import { PrimaryCTA } from '../../components/PrimaryCTA';
import { BackButton } from '../../components/BackButton';

export default function ProfileSelectionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedProfileId, setSelectedProfileId } = useAppState();
  const [idx, setIdx] = useState(() =>
    Math.max(0, profiles.findIndex(p => p.id === selectedProfileId)),
  );
  const profile = profiles[idx];

  const confirm = () => {
    setSelectedProfileId(profile.id);
    router.navigate('/(tabs)' as never);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: insets.top + 12,
          paddingBottom: 120,
        }}
      >
        <BackButton onPress={() => router.navigate('/(tabs)' as never)} label="Home" />
        <Text style={styles.heading}>Tonight&apos;s Profile</Text>

        {profile.recommended && (
          <View style={styles.recBadge}>
            <View style={styles.recDot} />
            <SmallCapsLabel style={{ color: colors.accent }}>Recommended</SmallCapsLabel>
          </View>
        )}
        <Text style={styles.profileName}>{profile.name}</Text>
        <Text style={styles.rationale}>{profile.rationale}</Text>

        <View style={styles.curveCard}>
          <ProfileCurve keyframes={profile.keyframes} width={342 - 8} height={140} showLabels />
          {idx > 0 && (
            <Pressable style={[styles.arrowBtn, { left: 10 }]} onPress={() => setIdx(i => i - 1)}>
              <Svg width={7} height={12} viewBox="0 0 7 12" fill="none">
                <Path d="M6 1L1 6L6 11" stroke={colors.textSec} strokeWidth={1.8} strokeLinecap="round" />
              </Svg>
            </Pressable>
          )}
          {idx < profiles.length - 1 && (
            <Pressable style={[styles.arrowBtn, { right: 10 }]} onPress={() => setIdx(i => i + 1)}>
              <Svg width={7} height={12} viewBox="0 0 7 12" fill="none">
                <Path d="M1 1L6 6L1 11" stroke={colors.textSec} strokeWidth={1.8} strokeLinecap="round" />
              </Svg>
            </Pressable>
          )}
        </View>

        <View style={styles.dotIndicators}>
          {profiles.map((_, i) => (
            <Pressable
              key={i}
              onPress={() => setIdx(i)}
              style={{
                width: i === idx ? 18 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === idx ? colors.accent : 'rgba(255,255,255,0.15)',
              }}
            />
          ))}
        </View>

        <View style={{ gap: 6, marginTop: 8 }}>
          {profile.phases.map((ph, i) => (
            <View key={ph.id} style={styles.phaseRow}>
              <View
                style={[
                  styles.phaseTick,
                  { backgroundColor: i === 0 ? 'rgba(255,255,255,0.12)' : colors.accentMid },
                ]}
              />
              <SmallCapsLabel style={{ width: 88 }}>{ph.name}</SmallCapsLabel>
              <View style={styles.phaseTrack}>
                <View
                  style={{
                    width: `${ph.dose * 100}%`,
                    height: '100%',
                    borderRadius: 2,
                    backgroundColor: colors.accent,
                    opacity: 0.55,
                  }}
                />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <BlurView
        intensity={28}
        tint="dark"
        style={[styles.pinned, { paddingBottom: 28 + insets.bottom }]}
      >
        <PrimaryCTA label="Use This Profile" onPress={confirm} />
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginTop: 14,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 30,
    color: colors.text,
    letterSpacing: -0.7,
    marginBottom: 20,
  },
  recBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.accentDim,
    borderWidth: 1,
    borderColor: colors.accentMid,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  recDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.accent },
  profileName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 26,
    color: colors.text,
    letterSpacing: -0.5,
  },
  rationale: { marginTop: 4, fontSize: 13, color: colors.textSec, fontFamily: 'Inter_400Regular', marginBottom: 14 },
  curveCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 4,
    paddingBottom: 10,
    overflow: 'hidden',
  },
  arrowBtn: {
    position: 'absolute',
    top: '50%',
    marginTop: -15,
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotIndicators: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginVertical: 12,
  },
  phaseRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  phaseTick: { width: 3, height: 20, borderRadius: 2 },
  phaseTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  pinned: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: 'rgba(10,11,15,0.88)',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
