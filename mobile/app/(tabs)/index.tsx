import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../../theme/tokens';
import { useAppNow } from '../../theme/CircadianThemeProvider';
import { OFFLINE_FALLBACK_PROFILE_ID, findProfile } from '../../utils/profiles';
import { formatMinutesAsTime12h } from '../../utils/sleepSchedule';
import { canApplyPatch } from '../../utils/sleepWindow';
import { useAppState } from '../../state/AppState';
import { MobileTabScreen, MOBILE_COLUMN_MAX } from '../../components/MobileTabScreen';
import { PrimaryCTA } from '../../components/PrimaryCTA';
import { StatNumber } from '../../components/StatNumber';
import { ScheduleTimePickerModal } from '../../components/ScheduleTimePickerModal';
import { useTonightPlan } from '../../utils/useTonightPlan';
import { useGoogleHealth } from '../../utils/useGoogleHealth';
import { GlassPanel } from '../../components/GlassPanel';
import { GoogleHealthConnectCard } from '../../components/GoogleHealthConnectCard';
import { planStatusLine } from '../../utils/planCopy';
import { subscribeSessionLog } from '../../utils/sessionLog';

const formatTime = (d: Date) =>
  d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
const formatDate = (d: Date) =>
  d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    bedtimeMinutes,
    setBedtimeMinutes,
    wakeMinutes,
    setWakeMinutes,
    tonightPlan,
  } = useAppState();
  const profile = tonightPlan?.profile ?? findProfile(OFFLINE_FALLBACK_PROFILE_ID);

  const appNow = useAppNow();
  const [pickerTarget, setPickerTarget] = useState<'bed' | 'wake' | null>(null);
  const [focusKey, setFocusKey] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setFocusKey((k) => k + 1);
    }, []),
  );

  useEffect(() => subscribeSessionLog(() => {
    setFocusKey((k) => k + 1);
  }), []);

  const gh = useGoogleHealth();
  const { status, source } = useTonightPlan({
    appNow,
    focusKey,
    googleHealthConnected: gh.connected,
  });

  const applyAllowed = canApplyPatch(appNow, bedtimeMinutes, wakeMinutes);
  const statusLine = planStatusLine({
    tonightPlan,
    status,
    source,
    ghStatus: gh.status,
  });

  return (
    <MobileTabScreen auroraInteractive>
      <View style={styles.column} pointerEvents="box-none">
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]} pointerEvents="box-none">
        <Text style={styles.brand} pointerEvents="none">
          sleepsync
        </Text>
        <Text style={styles.timeStamp} pointerEvents="none">
          {formatTime(appNow)} · {formatDate(appNow)}
        </Text>
      </View>

      <View style={styles.hero} pointerEvents="box-none">
        <Text style={styles.profileName} pointerEvents="none">
          {profile.name}
        </Text>
        <Text style={styles.statusLine} pointerEvents="none">
          {statusLine}
        </Text>
      </View>

      <GlassPanel
        variant="sheetTop"
        style={[styles.glassSheet, { paddingBottom: 28 + insets.bottom }]}
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

        <GoogleHealthConnectCard
          compact
          connectionOnly
          planLoading={status === 'loading' && !tonightPlan}
        />
        <PrimaryCTA
          label="Apply Patch Tonight"
          disabled={!applyAllowed}
          onPress={() => router.push('/live' as never)}
        />
        {!applyAllowed ? (
          <Text style={styles.applyBlockedHint}>
            In your sleep window, adjust bedtime above
          </Text>
        ) : null}
      </GlassPanel>

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
    marginBottom: 8,
  },
  statusLine: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 320,
    color: 'rgba(245,245,247,0.62)',
  },
  glassSheet: {
    zIndex: 2,
  },
  timeRow: { flexDirection: 'row', alignItems: 'center' },
  applyBlockedHint: {
    marginTop: 12,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(245,245,247,0.5)',
    textAlign: 'center',
  },
});
