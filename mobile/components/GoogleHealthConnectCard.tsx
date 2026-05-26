import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { fonts } from '../theme/tokens';
import { useCircadianColors } from '../theme/CircadianThemeProvider';
import { useThemedStyles } from '../theme/useThemedStyles';
import { GlassPanel } from './GlassPanel';
import { SmallCapsLabel } from './SmallCapsLabel';
import { googleHealthStatusLine } from '../utils/planCopy';
import { useGoogleHealth } from '../utils/useGoogleHealth';

type Props = {
  /** Embedded in Tonight bottom sheet — no outer glass shell. */
  compact?: boolean;
};

function ConnectBody({
  compact,
  gh,
  colors,
  styles,
}: {
  compact: boolean;
  gh: ReturnType<typeof useGoogleHealth>;
  colors: ReturnType<typeof useCircadianColors>;
  styles: {
    divider: object;
    status: object;
    statusCompact: object;
    button: object;
    buttonText: object;
    error: object;
  };
}) {
  const connected = gh.connected;
  const label = connected ? 'Disconnect' : 'Connect Google Health';

  return (
    <>
      {compact ? <View style={styles.divider} /> : null}
      <SmallCapsLabel style={compact ? { marginTop: 16 } : undefined}>Data source</SmallCapsLabel>
      <Text style={compact ? styles.statusCompact : styles.status}>
        {googleHealthStatusLine(gh.status, gh.loading)}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={connected ? 'Disconnect Google Health' : 'Connect Google Health'}
        disabled={gh.busy}
        onPress={() => (connected ? gh.disconnect() : gh.connect())}
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
      {gh.error ? <Text style={styles.error}>{gh.error}</Text> : null}
    </>
  );
}

export function GoogleHealthConnectCard({ compact = false }: Props) {
  const colors = useCircadianColors();
  const gh = useGoogleHealth();
  const styles = useThemedStyles((c) => ({
    compactWrap: {
      marginBottom: 16,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
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
        <ConnectBody compact gh={gh} colors={colors} styles={styles} />
      </View>
    );
  }

  return (
    <GlassPanel variant="card" style={{ marginTop: 20 }}>
      <ConnectBody compact={false} gh={gh} colors={colors} styles={styles} />
    </GlassPanel>
  );
}
