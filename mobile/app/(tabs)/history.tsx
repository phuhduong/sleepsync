import { ScrollView, View, Text, useWindowDimensions } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassPanel } from '../../components/GlassPanel';
import Svg, { Circle } from 'react-native-svg';
import { fonts, rgba } from '../../theme/tokens';
import { useCircadianColors } from '../../theme/CircadianThemeProvider';
import { useThemedStyles } from '../../theme/useThemedStyles';
import type { SessionRecord } from '../../domain/profiles';
import { loadSessions, subscribeSessionLog } from '../../services/sessionLog';
import { SmallCapsLabel } from '../../components/SmallCapsLabel';
import { SparkLine } from '../../components/SparkLine';
import { HistoryTimeline } from '../../components/HistoryTimeline';
import { PrimaryCTA } from '../../components/PrimaryCTA';
import { HistorySessionDetail } from '../../components/HistorySessionDetail';
import { MobileTabScreen, MOBILE_COLUMN_MAX } from '../../components/MobileTabScreen';

const EYEBROW = 'Past sessions';

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
    glassPanel: {
      marginTop: 20,
    },
  }));
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

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

  useEffect(() => {
    if (selected !== null && !sessions.some((s) => s.id === selected)) {
      setSelected(null);
    }
  }, [selected, sessions]);

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
    const session = sessions.find((h) => h.id === selected);
    if (session) {
      return (
        <HistorySessionDetail
          session={session}
          curveInnerW={curveInnerW}
          topInset={insets.top}
          onBack={() => setSelected(null)}
        />
      );
    }
  }

  return (
    <MobileTabScreen aurora={false}>
      <ScrollView
        style={styles.column}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: insets.top + 12, paddingBottom: 32 }}
      >
        <SmallCapsLabel style={styles.eyebrow}>{EYEBROW}</SmallCapsLabel>
        <Text style={styles.heading}>History</Text>

        <GlassPanel style={styles.glassPanel}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <SmallCapsLabel>{grogginessTitle}</SmallCapsLabel>
            <SmallCapsLabel>Lower is better</SmallCapsLabel>
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
