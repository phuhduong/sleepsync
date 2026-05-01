import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { colors, fonts } from '../../theme/tokens';
import { findProfile } from '../../utils/profiles';
import { formatMinutesAsTime12h } from '../../utils/sleepSchedule';
import { useAppState } from '../../state/AppState';
import { MobileTabScreen, MOBILE_COLUMN_MAX } from '../../components/MobileTabScreen';
import { SmallCapsLabel } from '../../components/SmallCapsLabel';
import { PrimaryCTA } from '../../components/PrimaryCTA';
import { StatNumber } from '../../components/StatNumber';
import { ScheduleTimePickerModal } from '../../components/ScheduleTimePickerModal';

const formatTime = (d: Date) =>
  d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
const formatDate = (d: Date) =>
  d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    selectedProfileId,
    isFirstTime,
    bedtimeMinutes,
    setBedtimeMinutes,
    wakeMinutes,
    setWakeMinutes,
  } = useAppState();
  const profile = findProfile(selectedProfileId);

  const [now, setNow] = useState(new Date());
  const [pickerTarget, setPickerTarget] = useState<'bed' | 'wake' | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const planLabel = isFirstTime ? 'Welcome · First session' : "Tonight's plan";
  const recommendedText = profile.recommended ? 'Recommended' : 'Custom';

  return (
    <MobileTabScreen auroraInteractive>
      <View style={styles.column} pointerEvents="box-none">
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]} pointerEvents="box-none">
        <Text style={styles.brand} pointerEvents="none">
          sleepsync
        </Text>
        <Text style={styles.timeStamp} pointerEvents="none">
          {formatTime(now)} · {formatDate(now)}
        </Text>
      </View>

      <View style={styles.hero} pointerEvents="box-none">
        <SmallCapsLabel
          style={[{ marginBottom: 14, pointerEvents: 'none' }, isFirstTime && { color: colors.accent }]}
        >
          {planLabel}
        </SmallCapsLabel>

        <Text style={styles.profileName} pointerEvents="none">
          {profile.name}
        </Text>
        <Text style={styles.rationale} pointerEvents="none">
          {profile.rationale}
        </Text>

        <Pressable
          onPress={() => router.push('/profile' as never)}
          style={styles.changeLink}
          hitSlop={6}
        >
          <Text style={styles.changeLinkText}>
            {recommendedText} <Text style={styles.changeLinkSep}>·</Text> <Text style={styles.changeLinkVerb}>Change profile</Text>
          </Text>
        </Pressable>
      </View>

      <BlurView
        intensity={28}
        tint="dark"
        style={[styles.glassCard, { paddingBottom: 28 + insets.bottom }]}
        pointerEvents="box-none"
      >
        <View style={styles.timeRow} pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Bedtime ${formatMinutesAsTime12h(bedtimeMinutes)}, tap to change`}
            onPress={() => setPickerTarget('bed')}
            style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.85 : 1 }]}
          >
            <StatNumber
              value={formatMinutesAsTime12h(bedtimeMinutes)}
              label="Bedtime"
              size={28}
              style={{ alignItems: 'flex-start' }}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Wake ${formatMinutesAsTime12h(wakeMinutes)}, tap to change`}
            onPress={() => setPickerTarget('wake')}
            style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.85 : 1 }]}
          >
            <StatNumber
              value={formatMinutesAsTime12h(wakeMinutes)}
              label="Wake"
              size={28}
              style={{ alignItems: 'flex-end' }}
            />
          </Pressable>
        </View>

        <PrimaryCTA label="Apply Patch Tonight" onPress={() => router.push('/live' as never)} />
      </BlurView>

      <ScheduleTimePickerModal
        target={pickerTarget}
        bedtimeMinutes={bedtimeMinutes}
        wakeMinutes={wakeMinutes}
        onDismiss={() => setPickerTarget(null)}
        onApply={(which, mins) => {
          if (which === 'bed') setBedtimeMinutes(mins);
          else setWakeMinutes(mins);
        }}
      />
      </View>
    </MobileTabScreen>
  );
}

const styles = StyleSheet.create({
  column: {
    flex: 1,
    width: '100%',
    maxWidth: MOBILE_COLUMN_MAX,
    alignSelf: 'center',
    zIndex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 2,
  },
  brand: {
    fontFamily: fonts.bodyM,
    fontSize: 18,
    letterSpacing: -0.3,
    color: 'rgba(245,245,247,0.92)',
  },
  timeStamp: {
    fontFamily: fonts.body,
    fontSize: 14,
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
  profileName: {
    fontFamily: fonts.hero,
    fontSize: 56,
    color: '#F5F5F7',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  rationale: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: 'rgba(245,245,247,0.62)',
    lineHeight: 22,
    maxWidth: 310,
  },
  changeLink: {
    marginTop: 14,
    alignSelf: 'flex-start',
  },
  changeLinkText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSec,
  },
  changeLinkSep: {
    color: colors.textTer,
  },
  changeLinkVerb: {
    color: colors.text,
    fontFamily: fonts.bodyM,
  },
  glassCard: {
    backgroundColor: 'rgba(12,13,18,0.82)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.09)',
    paddingHorizontal: 24,
    paddingTop: 28,
    overflow: 'hidden',
    zIndex: 2,
  },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 22 },
});
