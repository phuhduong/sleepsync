import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { fonts } from '../theme/tokens';
import { useCircadianColors } from '../theme/CircadianThemeProvider';
import { useThemedStyles } from '../theme/useThemedStyles';
import { GlassPanel } from './GlassPanel';
import { PrimaryCTA } from './PrimaryCTA';
import { SmallCapsLabel } from './SmallCapsLabel';
import { googleHealthStatusLine } from '../utils/planCopy';
import type { PlanMetadata } from '../utils/apiTypes';
import { useAppState } from '../state/AppState';
import { useGoogleHealth } from '../utils/useGoogleHealth';

type Props = {
  /** Embedded in Tonight bottom sheet — no outer glass shell. */
  compact?: boolean;
  /** When true, show plan-build spinner in the data-source line. */
  planLoading?: boolean;
  /**
   * On Tonight, provenance lives under the profile name. The card only shows
   * connection and sync time.
   */
  connectionOnly?: boolean;
};

function ConnectBody({
  compact,
  gh,
  planMetadata,
  planLoading,
  connectionOnly,
  colors,
  styles,
}: {
  compact: boolean;
  gh: ReturnType<typeof useGoogleHealth>;
  planMetadata?: PlanMetadata;
  planLoading: boolean;
  connectionOnly: boolean;
  colors: ReturnType<typeof useCircadianColors>;
  styles: {
    status: object;
    statusCompact: object;
    button: object;
    buttonText: object;
    error: object;
  };
}) {
  const connected = gh.connected;
  const label = connected ? 'Disconnect Google Health' : 'Connect Google Health';
  const onPress = () => (connected ? gh.disconnect() : gh.connect());
  const showSectionLabel = !connectionOnly;

  return (
    <>
      {showSectionLabel ? (
        <SmallCapsLabel style={compact ? { marginTop: 16 } : undefined}>
          {connectionOnly ? 'Google Health' : 'Data source'}
        </SmallCapsLabel>
      ) : null}
      {!connectionOnly ? (
        <Text style={compact ? styles.statusCompact : styles.status}>
          {googleHealthStatusLine(gh.status, gh.loading, planMetadata, planLoading, {
            connectionOnly,
          })}
        </Text>
      ) : null}
      {compact ? (
        <PrimaryCTA
          label={label}
          onPress={onPress}
          loading={gh.busy}
          variant="glassDark"
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={connected ? 'Disconnect Google Health' : 'Connect Google Health'}
          disabled={gh.busy}
          onPress={onPress}
          style={({ pressed }) => [
            styles.button,
            !connected && {
              borderColor: colors.accentDim,
              backgroundColor: colors.surface2,
            },
            connected && {
              borderColor: colors.border,
              backgroundColor: 'transparent',
            },
            { opacity: gh.busy || pressed ? 0.72 : 1 },
          ]}
        >
          {gh.busy ? (
            <ActivityIndicator size="small" color={colors.textSec} />
          ) : null}
          <Text
            style={[
              styles.buttonText,
              { color: connected ? colors.textTer : colors.text },
            ]}
          >
            {label}
          </Text>
        </Pressable>
      )}
      {gh.error ? <Text style={styles.error}>{gh.error}</Text> : null}
    </>
  );
}

export function GoogleHealthConnectCard({
  compact = false,
  planLoading = false,
  connectionOnly = false,
}: Props) {
  const colors = useCircadianColors();
  const gh = useGoogleHealth();
  const { tonightPlan } = useAppState();
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
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: c.borderMid,
    },
    buttonText: {
      fontFamily: fonts.bodyS,
      fontSize: 15,
      letterSpacing: 0.2,
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

  if (compact) {
    return (
      <View style={styles.compactWrap}>
        <ConnectBody
          compact
          gh={gh}
          planMetadata={tonightPlan?.metadata}
          planLoading={planLoading}
          connectionOnly={connectionOnly}
          colors={colors}
          styles={styles}
        />
      </View>
    );
  }

  return (
    <GlassPanel variant="card" style={{ marginTop: 20 }}>
      <ConnectBody
        compact={false}
        gh={gh}
        planMetadata={tonightPlan?.metadata}
        planLoading={planLoading}
        connectionOnly={connectionOnly}
        colors={colors}
        styles={styles}
      />
    </GlassPanel>
  );
}
