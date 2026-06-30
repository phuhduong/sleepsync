import { View, Text } from 'react-native';
import { fonts } from '../theme/tokens';
import { useThemedStyles } from '../theme/useThemedStyles';
import { GlassPanel } from './GlassPanel';
import { PrimaryCTA } from './PrimaryCTA';
import { SmallCapsLabel } from './SmallCapsLabel';
import { googleHealthStatusLine } from '../domain/planCopy';
import { useTonightPlan } from '../state/TonightPlanContext';
import { useGoogleHealth } from '../state/GoogleHealthContext';

type Props = {
  compact?: boolean;
  planLoading?: boolean;
  connectionOnly?: boolean;
};

export function GoogleHealthConnectCard({
  compact = false,
  planLoading = false,
  connectionOnly = false,
}: Props) {
  const gh = useGoogleHealth();
  const { plan: tonightPlan } = useTonightPlan();
  const styles = useThemedStyles((c) => ({
    compactWrap: {
      marginTop: 24,
      marginBottom: 12,
    },
    status: {
      marginTop: 8,
      marginBottom: 14,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 21,
      color: c.textSec,
    },
    statusCompact: {
      marginTop: 8,
      marginBottom: 14,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
      color: c.textSec,
    },
    error: {
      marginTop: 10,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
      color: c.dangerDim,
    },
  }));

  if (!gh.enabled) return null;

  const connected = gh.connected;
  const label = connected ? 'Disconnect Google Health' : 'Connect Google Health';
  const onPress = () => (connected ? gh.disconnect() : gh.connect());
  const statusStyle = compact ? styles.statusCompact : styles.status;

  const body = (
    <>
      {!connectionOnly ? (
        <SmallCapsLabel style={compact ? { marginTop: 16 } : undefined}>
          {connectionOnly ? 'Google Health' : 'Data source'}
        </SmallCapsLabel>
      ) : null}
      {!connectionOnly ? (
        <Text style={statusStyle}>
          {googleHealthStatusLine(gh.status, gh.loading, tonightPlan?.metadata, planLoading, {
            connectionOnly,
          })}
        </Text>
      ) : null}
      <PrimaryCTA label={label} onPress={onPress} loading={gh.busy} />
      {gh.error ? <Text style={styles.error}>{gh.error}</Text> : null}
    </>
  );

  if (compact) {
    return <View style={styles.compactWrap}>{body}</View>;
  }

  return (
    <GlassPanel variant="card" style={{ marginTop: 20 }}>
      {body}
    </GlassPanel>
  );
}
