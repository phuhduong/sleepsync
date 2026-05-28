import { ScrollView, View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassPanel } from '../../components/GlassPanel';
import Svg, { Circle } from 'react-native-svg';
import { fonts, rgba } from '../../theme/tokens';
import { useCircadianColors } from '../../theme/CircadianThemeProvider';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { sessionKeyframes } from '../../utils/profiles';
import { sessionDetailHeading, sessionDetailRationale } from '../../utils/sessionDisplay';
import type { SessionRecord } from '../../utils/profiles';
import { loadSessions, subscribeSessionLog } from '../../utils/sessionLog';
import { SmallCapsLabel } from '../../components/SmallCapsLabel';
import { ProfileCurve } from '../../components/ProfileCurve';
import { SparkLine } from '../../components/SparkLine';
import { HistoryTimeline } from '../../components/HistoryTimeline';
import { DotScale } from '../../components/DotScale';
import { StatNumber } from '../../components/StatNumber';
import { PrimaryCTA } from '../../components/PrimaryCTA';
import { BackButton } from '../../components/BackButton';
import { MobileTabScreen, MOBILE_COLUMN_MAX } from '../../components/MobileTabScreen';

const EYEBROW = 'Past sessions';

function wokeLabel(woke: SessionRecord['woke']): string {
  if (woke === 'no') return 'No';
  if (woke === 'yes') return 'Yes';
  return "Can't say";
}

export default function HistoryScreen() {
  const colors = useCircadianColors();
  const styles = useThemedStyles((c) => ({
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
      color: c.text,
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
      color: c.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptyBody: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: c.textSec,
      lineHeight: 22,
      maxWidth: 260,
      textAlign: 'center',
    },
    detailTitle: {
      fontFamily: fonts.hero,
      fontSize: 44,
      color: c.text,
      letterSpacing: -0.8,
      marginBottom: 8,
    },
    detailSubtitle: {
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 24,
    },
    glassPanel: {
      marginTop: 20,
    },
    statsRow: {
      marginTop: 28,
      flexDirection: 'row',
      gap: 12,
      paddingTop: 24,
      paddingBottom: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    groggyBlock: {
      marginTop: 8,
      paddingTop: 20,
      paddingBottom: 4,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
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
      borderTopColor: c.border,
    },
    summaryText: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: c.textSec,
      lineHeight: 22,
    },
    noteText: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: c.textTer,
      lineHeight: 22,
      marginTop: 10,
      fontStyle: 'italic',
    },
  }));
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);

  const reloadSessions = useCallback(() => {
    setLoading(true);
    loadSessions()
      .then((rows) => {
        setSessions(rows);
        setSelected((prev) =>
          prev !== null && rows.some((r) => r.id === prev) ? prev : null,
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      reloadSessions();
    }, [reloadSessions]),
  );

  useEffect(() => subscribeSessionLog(reloadSessions), [reloadSessions]);

  const grogginess = sessions.map((h) => h.groggy);
  const contentW = Math.min(windowWidth, MOBILE_COLUMN_MAX);
  const scrollPad = 48;
  const chartW = contentW - scrollPad - 32;
  const curveInnerW = contentW - scrollPad - 32;

  const oldestLabel = sessions.length ? sessions[sessions.length - 1].date : '';
  const newestLabel = sessions.length ? sessions[0].date : '';
  const sessionsCount = sessions.length;
  const grogginessTitle =
    sessionsCount === 1
      ? 'Grogginess — 1 session'
      : `Grogginess — last ${sessionsCount} sessions`;

  if (loading) {
    return (
      <MobileTabScreen aurora={false}>
        <View style={[styles.column, { paddingHorizontal: 24, paddingTop: insets.top + 12 }]}>
          <SmallCapsLabel style={styles.eyebrow}>{EYEBROW}</SmallCapsLabel>
          <Text style={styles.heading}>History</Text>
        </View>
      </MobileTabScreen>
    );
  }

  if (sessions.length === 0) {
    return (
      <MobileTabScreen aurora={false}>
        <View style={[styles.column, { paddingHorizontal: 24, paddingTop: insets.top + 12 }]}>
          <SmallCapsLabel style={styles.eyebrow}>{EYEBROW}</SmallCapsLabel>
          <Text style={styles.heading}>History</Text>
          <View style={styles.emptyWrap}>
            <Svg width={80} height={80} viewBox="0 0 80 80" fill="none">
              <Circle cx={40} cy={40} r={38} stroke={rgba(colors.accent, 0.2)} strokeWidth={1.5} />
              <Circle cx={40} cy={40} r={26} stroke={rgba(colors.accent, 0.12)} strokeWidth={1} />
              <Circle cx={40} cy={40} r={5} fill={rgba(colors.accent, 0.3)} />
            </Svg>
            <View style={{ alignItems: 'center', marginTop: 20 }}>
              <Text style={styles.emptyTitle}>No sessions yet</Text>
              <Text style={styles.emptyBody}>
                {'Your first session will appear here after your morning debrief.'}
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
    const s = sessions.find((h) => h.id === selected)!;
    const keyframes = sessionKeyframes(s);
    const detailRationale = sessionDetailRationale(s);
    return (
      <MobileTabScreen aurora={false}>
        <ScrollView
          style={styles.column}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: insets.top + 24, paddingBottom: 32 }}
        >
          <BackButton onPress={() => setSelected(null)} label="History" />
          <SmallCapsLabel style={{ marginBottom: 8, marginTop: 16 }}>{s.date}</SmallCapsLabel>
          <Text
            style={[styles.detailTitle, !detailRationale && { marginBottom: 24 }]}
          >
            {sessionDetailHeading(s)}
          </Text>
          {detailRationale ? (
            <Text style={[styles.detailSubtitle, { color: colors.textSec }]}>
              {detailRationale}
            </Text>
          ) : null}

          <GlassPanel style={styles.glassPanel}>
            <SmallCapsLabel style={{ marginBottom: 12 }}>Delivery Profile</SmallCapsLabel>
            <ProfileCurve keyframes={keyframes} width={curveInnerW} height={120} />
          </GlassPanel>

          <View style={styles.statsRow}>
            <StatNumber
              value={wokeLabel(s.woke)}
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
            {s.note ? <Text style={styles.noteText}>{s.note}</Text> : null}
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

        <GlassPanel style={styles.glassPanel}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <SmallCapsLabel>{grogginessTitle}</SmallCapsLabel>
            <SmallCapsLabel>↓ trending better</SmallCapsLabel>
          </View>
          <SparkLine
            data={[...grogginess].reverse()}
            width={chartW}
            height={44}
            valueMin={1}
            valueMax={5}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <SmallCapsLabel>{oldestLabel}</SmallCapsLabel>
            <SmallCapsLabel>{newestLabel}</SmallCapsLabel>
          </View>
        </GlassPanel>

        <View style={{ marginTop: 24 }}>
          <SmallCapsLabel style={{ marginBottom: 14 }}>Recent sessions</SmallCapsLabel>
          <HistoryTimeline sessions={sessions} onSelectSession={(id) => setSelected(id)} />
        </View>
      </ScrollView>
    </MobileTabScreen>
  );
}
