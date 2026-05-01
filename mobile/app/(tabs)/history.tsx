import { ScrollView, View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Svg, { Circle } from 'react-native-svg';
import { colors, fonts } from '../../theme/tokens';
import { history, profiles, findProfile } from '../../utils/profiles';
import { useAppState } from '../../state/AppState';
import { SmallCapsLabel } from '../../components/SmallCapsLabel';
import { ProfileCurve } from '../../components/ProfileCurve';
import { SparkLine } from '../../components/SparkLine';
import { HistoryTimeline } from '../../components/HistoryTimeline';
import { DotScale } from '../../components/DotScale';
import { StatNumber } from '../../components/StatNumber';
import { PrimaryCTA } from '../../components/PrimaryCTA';
import { BackButton } from '../../components/BackButton';
import { MobileTabScreen, MOBILE_COLUMN_MAX } from '../../components/MobileTabScreen';

const EYEBROW = 'Past nights';

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { isFirstTime } = useAppState();
  const [selected, setSelected] = useState<number | null>(null);

  const grogginess = history.map(h => h.groggy);
  const contentW = Math.min(windowWidth, MOBILE_COLUMN_MAX);
  const scrollPad = 48;
  const chartW = contentW - scrollPad - 32;
  const curveInnerW = contentW - scrollPad - 32;

  const oldestLabel = history.length ? history[history.length - 1].date : '';
  const newestLabel = history.length ? history[0].date : '';
  const nightsCount = history.length;
  const grogginessTitle =
    nightsCount === 1 ? 'Grogginess — 1 night' : `Grogginess — last ${nightsCount} nights`;

  if (isFirstTime || history.length === 0) {
    return (
      <MobileTabScreen aurora={false}>
        <View style={[styles.column, { paddingHorizontal: 24, paddingTop: insets.top + 12 }]}>
          <SmallCapsLabel style={styles.eyebrow}>{EYEBROW}</SmallCapsLabel>
          <Text style={styles.heading}>History</Text>
          <View style={styles.emptyWrap}>
            <Svg width={80} height={80} viewBox="0 0 80 80" fill="none">
              <Circle cx={40} cy={40} r={38} stroke="rgba(123,92,240,0.2)" strokeWidth={1.5} />
              <Circle cx={40} cy={40} r={26} stroke="rgba(123,92,240,0.12)" strokeWidth={1} />
              <Circle cx={40} cy={40} r={5} fill="rgba(123,92,240,0.3)" />
            </Svg>
            <View style={{ alignItems: 'center', marginTop: 20 }}>
              <Text style={styles.emptyTitle}>No sessions yet</Text>
              <Text style={styles.emptyBody}>
                {"Your first night's data will appear here after your morning debrief."}
              </Text>
            </View>
            <View style={{ marginTop: 12, alignSelf: 'stretch' }}>
              <PrimaryCTA label="Set Up Tonight" onPress={() => router.navigate('/(tabs)' as never)} />
            </View>
          </View>
        </View>
      </MobileTabScreen>
    );
  }

  if (selected !== null) {
    const s = history.find(h => h.id === selected)!;
    const prof = profiles.find(p => p.name === s.profile) ?? findProfile('standard');
    return (
      <MobileTabScreen aurora={false}>
        <ScrollView
          style={styles.column}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: insets.top + 24, paddingBottom: 32 }}
        >
          <BackButton onPress={() => setSelected(null)} label="History" />
          <SmallCapsLabel style={{ marginBottom: 8, marginTop: 16 }}>{s.date}</SmallCapsLabel>
          <Text style={styles.detailTitle}>{s.profile}</Text>

          <BlurView intensity={28} tint="dark" style={styles.detailGlass}>
            <View style={styles.glassInner}>
              <SmallCapsLabel style={{ marginBottom: 12 }}>Delivery Profile</SmallCapsLabel>
              <ProfileCurve keyframes={prof.keyframes} width={curveInnerW} height={120} />
            </View>
          </BlurView>

          <View style={styles.statsRow}>
            <StatNumber
              value={s.woke === 'no' ? 'No' : 'Yes'}
              label="Woke?"
              size={24}
              style={{ flex: 1 }}
            />
            <StatNumber
              value={s.outcome === 'good' ? 'Good' : 'Ok'}
              label="Outcome"
              size={24}
              style={{ flex: 1 }}
            />
          </View>

          <View style={styles.groggyBlock}>
            <SmallCapsLabel style={{ marginBottom: 10 }}>Grogginess</SmallCapsLabel>
            <DotScale value={s.groggy} max={5} readOnly />
            <View style={styles.scaleEnds}>
              <SmallCapsLabel>None</SmallCapsLabel>
              <SmallCapsLabel>Very</SmallCapsLabel>
            </View>
          </View>

          <View style={styles.summaryCard}>
            <SmallCapsLabel style={{ marginBottom: 6 }}>Summary</SmallCapsLabel>
            <Text style={styles.summaryText}>{s.summary}</Text>
          </View>
        </ScrollView>
      </MobileTabScreen>
    );
  }

  return (
    <MobileTabScreen aurora={false}>
      <ScrollView
        style={styles.column}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: insets.top + 12, paddingBottom: 32 }}
      >
        <SmallCapsLabel style={styles.eyebrow}>{EYEBROW}</SmallCapsLabel>
        <Text style={styles.heading}>History</Text>

        <BlurView intensity={28} tint="dark" style={styles.sparkGlass}>
          <View style={styles.glassInner}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <SmallCapsLabel>{grogginessTitle}</SmallCapsLabel>
              <SmallCapsLabel>↓ trending better</SmallCapsLabel>
            </View>
            <SparkLine data={[...grogginess].reverse()} width={chartW} height={44} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
              <SmallCapsLabel>{oldestLabel}</SmallCapsLabel>
              <SmallCapsLabel>{newestLabel}</SmallCapsLabel>
            </View>
          </View>
        </BlurView>

        <View style={{ marginTop: 24 }}>
          <SmallCapsLabel style={{ marginBottom: 14 }}>Recent nights</SmallCapsLabel>
          <HistoryTimeline sessions={history} onSelectSession={(id) => setSelected(id)} />
        </View>
      </ScrollView>
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
  eyebrow: {
    marginBottom: 10,
  },
  heading: {
    fontFamily: fonts.hero,
    fontSize: 44,
    color: colors.text,
    letterSpacing: -0.8,
    marginBottom: 4,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    paddingBottom: 80,
    marginTop: 8,
  },
  emptyTitle: {
    fontFamily: fonts.hero,
    fontSize: 30,
    letterSpacing: -0.5,
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSec,
    lineHeight: 22,
    maxWidth: 260,
    textAlign: 'center',
  },
  detailTitle: {
    fontFamily: fonts.hero,
    fontSize: 44,
    color: colors.text,
    letterSpacing: -0.8,
    marginBottom: 24,
  },
  sparkGlass: {
    marginTop: 20,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(12,13,18,0.82)',
  },
  detailGlass: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(12,13,18,0.82)',
  },
  glassInner: {
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  statsRow: {
    marginTop: 28,
    flexDirection: 'row',
    gap: 12,
    paddingTop: 24,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  groggyBlock: {
    marginTop: 8,
    paddingTop: 20,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  scaleEnds: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  summaryCard: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  summaryText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSec,
    lineHeight: 22,
  },
});
