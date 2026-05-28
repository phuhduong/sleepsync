import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCircadianColors } from '../../theme/CircadianThemeProvider';
import { fonts } from '../../theme/tokens';
import { useGoogleHealth } from '../../state/GoogleHealthContext';

/**
 * OAuth return landing (web + deep link). Google redirects to the backend;
 * the backend redirects here with ?connected=1 or ?error=….
 */
export default function GoogleHealthCallbackScreen() {
  const router = useRouter();
  const colors = useCircadianColors();
  const { connected, error } = useLocalSearchParams<{
    connected?: string;
    error?: string;
  }>();

  const { refresh } = useGoogleHealth();

  const failed =
    typeof error === 'string' ||
    connected === '0' ||
    connected === 'false';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!failed) {
        try {
          await refresh();
        } catch {
          /* status refresh is best-effort */
        }
      }
      if (!cancelled) {
        router.replace('/(tabs)');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [failed, refresh, router]);

  const message = failed
    ? 'Google Health connection did not complete.'
    : 'Connected. Returning to Tonight.';

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ActivityIndicator color={colors.accent} />
      <Text style={[styles.text, { color: colors.textSec }]}>{message}</Text>
      {failed && typeof error === 'string' ? (
        <Text style={[styles.detail, { color: colors.textTer }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  text: {
    fontFamily: fonts.body,
    fontSize: 15,
    textAlign: 'center',
  },
  detail: {
    fontFamily: fonts.body,
    fontSize: 13,
    textAlign: 'center',
  },
});
