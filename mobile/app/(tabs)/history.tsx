import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../../theme/tokens';
import { history, profiles, findProfile } from '../../utils/profiles';
import { useAppState } from '../../state/AppState';
import { SmallCapsLabel } from '../../components/SmallCapsLabel';
import { ProfileCurve } from '../../components/ProfileCurve';
import { SparkLine } from '../../components/SparkLine';
import { SessionCard } from '../../components/SessionCard';
import { PrimaryCTA } from '../../components/PrimaryCTA';
import { BackButton } from '../../components/BackButton';

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isFirstTime } = useAppState();
  const [selected, setSelected] = useState<number | null>(null);

  const grogginess = history.map(h => h.groggy);

  if (isFirstTime || history.length === 0) {
    return (
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: insets.top + 12 }}>
        <View style={styles.headerRow}>
          <Text style={styles.heading}>History</Text>
          <BackButton onPress={() => router.navigate('/(tabs)' as never)} label="Home" />
        </View>
        <View style={styles.emptyWrap}>
          <Svg width={80} height={80} viewBox="0 0 80 80" fill="none">
            <Circle cx={40} cy={40} r={38} stroke="rgba(123,92,240,0.2)" strokeWidth={1.5} />
            <Circle cx={40} cy={40} r={26} stroke="rgba(123,92,240,0.12)" strokeWidth={1} />
            <Circle cx={40} cy={40} r={5} fill="rgba(123,92,240,0.3)" />
          </Svg>
          <View style={{ alignItems: 'center', marginTop: 20 }}>
            <Text style={styles.emptyTitle}>No sessions yet</Text>
            <Text style={styles.emptyBody}>Your first night&apos;s data will appear here after your morning debrief.</Text>
          </View>
          <View style={{ marginTop: 12, alignSelf: 'stretch' }}>
            <PrimaryCTA label="Set Up Tonight" onPress={() => router.navigate('/(tabs)' as never)} />
          </View>
        </View>
      </View>
    );
  }

  if (selected !== null) {
    const s = history.find(h => h.id === selected)!;
    const prof = profiles.find(p => p.name === s.profile) ?? findProfile('standard');
    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: insets.top + 12, paddingBottom: 32 }}
      >
        <BackButton onPress={() => setSelected(null)} label="History" />
        <SmallCapsLabel style={{ marginTop: 16, marginBottom: 6 }}>{s.date}</SmallCapsLabel>
        <Text style={styles.detailTitle}>{s.profile}</Text>

        <View style={styles.detailCard}>
          <SmallCapsLabel style={{ marginBottom: 12 }}>Delivery Profile</SmallCapsLabel>
          <ProfileCurve keyframes={prof.keyframes} width={318 - 24} height={120} showLabels />
        </View>

        <View style={styles.statsRow}>
          {[
            ['Woke?', s.woke === 'no' ? 'No' : 'Yes'],
            ['Grogginess', `${s.groggy} / 5`],
            ['Outcome', s.outcome === 'good' ? 'Good' : 'Fair'],
          ].map(([l, v]) => (
            <View key={l} style={styles.statTile}>
              <SmallCapsLabel style={{ marginBottom: 6, textAlign: 'center' }}>{l}</SmallCapsLabel>
              <Text style={styles.statValue}>{v}</Text>
            </View>
          ))}
        </View>

        <View style={styles.summaryCard}>
          <SmallCapsLabel style={{ marginBottom: 6 }}>Summary</SmallCapsLabel>
          <Text style={styles.summaryText}>{s.summary}</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: insets.top + 12, paddingBottom: 32 }}
    >
      <View style={styles.headerRow}>
        <Text style={styles.heading}>History</Text>
        <BackButton onPress={() => router.navigate('/(tabs)' as never)} label="Home" />
      </View>

      <View style={styles.sparkCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <SmallCapsLabel>Grogginess — 5 nights</SmallCapsLabel>
          <SmallCapsLabel style={{ color: colors.accent }}>↓ trending better</SmallCapsLabel>
        </View>
        <SparkLine data={[...grogginess].reverse()} width={318 - 32} height={44} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          <SmallCapsLabel>Apr 15</SmallCapsLabel>
          <SmallCapsLabel>Apr 20</SmallCapsLabel>
        </View>
      </View>

      <View style={{ marginTop: 16, gap: 10 }}>
        {history.map(s => (
          <SessionCard key={s.id} session={s} onPress={() => setSelected(s.id)} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  heading: { fontFamily: 'Inter_600SemiBold', fontSize: 36, color: colors.text, letterSpacing: -0.9 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 0, paddingBottom: 80 },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 22, color: colors.text, marginBottom: 8 },
  emptyBody: { fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textSec, lineHeight: 22, maxWidth: 260, textAlign: 'center' },
  sparkCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  detailTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 34,
    color: colors.text,
    letterSpacing: -0.8,
    marginBottom: 24,
  },
  detailCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 12,
    paddingTop: 20,
  },
  statsRow: { marginTop: 20, flexDirection: 'row', gap: 12 },
  statTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  statValue: { fontFamily: 'Inter_600SemiBold', fontSize: 18, color: colors.text },
  summaryCard: {
    marginTop: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  summaryText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.textSec, lineHeight: 22 },
});
