import { Platform, Text, View } from 'react-native';
import { fonts } from '../theme/tokens';
import { useThemedStyles } from '../theme/useThemedStyles';
import { PrimaryCTA } from './PrimaryCTA';
import { SmallCapsLabel } from './SmallCapsLabel';
import { usePatchBle } from '../hooks/usePatchBle';

export function PatchConnectCard() {
  const { enabled, supported, connected, state, error, connect, disconnect } =
    usePatchBle();
  const styles = useThemedStyles((c) => ({
    wrap: {
      marginTop: 12,
      marginBottom: 12,
    },
    error: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: c.danger,
      marginTop: 8,
      lineHeight: 16,
    },
  }));

  if (!enabled) return null;

  const connecting = state === 'connecting';
  const label = (() => {
    if (!supported) {
      return Platform.OS === 'web' ? 'BLE unavailable in this browser' : 'BLE unavailable';
    }
    if (connected) return 'Disconnect Patch';
    if (connecting) {
      return Platform.OS === 'web' ? 'Waiting for Chrome picker…' : 'Scanning for patch…';
    }
    if (state === 'error') return 'Retry Connect Patch';
    return 'Connect Patch';
  })();

  const onPress = () => {
    if (connected) {
      void disconnect();
      return;
    }
    void connect();
  };

  return (
    <View style={styles.wrap}>
      <SmallCapsLabel>Patch</SmallCapsLabel>
      <PrimaryCTA
        label={label}
        onPress={onPress}
        loading={connecting}
        disabled={!supported}
      />
      {state === 'error' && error ? (
        <Text style={styles.error}>{error}</Text>
      ) : null}
    </View>
  );
}
