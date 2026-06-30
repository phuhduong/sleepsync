import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { GlassPanel } from './GlassPanel';
import { useCircadianColors } from '../theme/CircadianThemeProvider';
import { useThemedStyles } from '../theme/useThemedStyles';
import { OFFLINE_PROFILE, type SessionRecord } from '../domain/profiles';
import { sessionDetailHeading } from '../domain/sessionPresentation';
import { wearableProvenanceLine } from '../domain/planCopy';
import { SmallCapsLabel } from './SmallCapsLabel';
import { ProfileCurve } from './ProfileCurve';
import { DotScale } from './DotScale';
import { StatNumber } from './StatNumber';
import { BackButton } from './BackButton';
import { MobileTabScreen } from './MobileTabScreen';
import { fonts } from '../theme/tokens';

function wokeLabel(woke: SessionRecord['woke']): string {
  if (woke === 'no') return 'No';
  if (woke === 'yes') return 'Yes';
  return "Can't Say";
}

type HistorySessionDetailProps = {
  session: SessionRecord;
  curveInnerW: number;
  topInset: number;
  onBack: () => void;
};

export function HistorySessionDetail({
  session,
  curveInnerW,
  topInset,
  onBack,
}: HistorySessionDetailProps) {
  const colors = useCircadianColors();
  const styles = useThemedStyles((c) => ({
    column: {
      flex: 1,
      width: '100%',
      maxWidth: 390,
      alignSelf: 'center',
      zIndex: 1,
    },
    detailTitle: {
      fontFamily: fonts.hero,
      fontSize: 44,
      color: c.text,
      letterSpacing: -0.8,
      marginBottom: 8,
    },
    scheduleTimeTitle: {
      fontFamily: fonts.bodyS,
      fontSize: 28,
      color: c.text,
      lineHeight: 28,
      letterSpacing: -0.35,
      fontVariant: ['tabular-nums'],
      marginBottom: 24,
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

  const keyframes = session.keyframes?.length ? session.keyframes : OFFLINE_PROFILE.keyframes;
  const detailRationale = session.rationale?.trim() || undefined;
  const hasScheduleTimes = session.bedtimeMinutes != null && session.wakeMinutes != null;
  const detailHeading = sessionDetailHeading(session);
  const wearableLine = wearableProvenanceLine(session.wearableVerified);

  return (
    <MobileTabScreen aurora={false}>
      <ScrollView
        style={styles.column}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: topInset + 24, paddingBottom: 32 }}
      >
        <BackButton onPress={onBack} label="History" />
        <SmallCapsLabel style={{ marginBottom: 8, marginTop: 16 }}>{session.date}</SmallCapsLabel>
        <Text
          style={
            hasScheduleTimes
              ? [styles.scheduleTimeTitle, detailRationale && { marginBottom: 8 }]
              : [styles.detailTitle, !detailRationale && { marginBottom: 24 }]
          }
        >
          {detailHeading}
        </Text>
        {detailRationale ? (
          <Text style={[styles.detailSubtitle, { color: colors.textSec }]}>{detailRationale}</Text>
        ) : null}

        <GlassPanel style={styles.glassPanel}>
          <SmallCapsLabel style={{ marginBottom: 12 }}>Delivery Profile</SmallCapsLabel>
          <ProfileCurve keyframes={keyframes} width={curveInnerW} height={120} />
        </GlassPanel>

        <View style={styles.statsRow}>
          <StatNumber value={wokeLabel(session.woke)} label="Woke?" size={24} style={{ flex: 1 }} />
          <StatNumber
            value={session.outcome === 'good' ? 'Good' : 'Fine'}
            label="Outcome"
            size={24}
            style={{ flex: 1 }}
          />
        </View>

        <View style={styles.groggyBlock}>
          <SmallCapsLabel style={{ marginBottom: 10 }}>Grogginess</SmallCapsLabel>
          <DotScale value={session.groggy} max={5} readOnly />
          <View style={styles.scaleEnds}>
            <SmallCapsLabel>None</SmallCapsLabel>
            <SmallCapsLabel>Very</SmallCapsLabel>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <SmallCapsLabel style={{ marginBottom: 6 }}>Summary</SmallCapsLabel>
          <Text style={styles.summaryText}>{session.summary}</Text>
          {wearableLine ? (
            <Text style={[styles.summaryText, { marginTop: 8 }]}>{wearableLine}</Text>
          ) : null}
          {session.note ? <Text style={styles.noteText}>{session.note}</Text> : null}
        </View>
      </ScrollView>
    </MobileTabScreen>
  );
}
