import { Pressable, Text, View, StyleSheet } from 'react-native';
import { colors } from '../theme/tokens';
import { SmallCapsLabel } from './SmallCapsLabel';
import type { SessionRecord } from '../utils/profiles';

type Props = {
  session: SessionRecord;
  onPress: () => void;
};

export function SessionCard({ session, onPress }: Props) {
  const good = session.outcome === 'good';
  const glyphColor = good ? colors.accent : 'rgba(245,245,247,0.3)';
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={{ flex: 1 }}>
        <SmallCapsLabel style={{ marginBottom: 4 }}>{session.date}</SmallCapsLabel>
        <Text style={styles.title}>{session.profile}</Text>
        <Text style={styles.summary}>{session.summary}</Text>
      </View>
      <View
        style={[
          styles.glyph,
          { backgroundColor: good ? colors.accentDim : 'rgba(255,255,255,0.06)' },
        ]}
      >
        <Text style={[styles.glyphText, { color: glyphColor }]}>{good ? '✓' : '–'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  title: { fontFamily: 'Inter_600SemiBold', fontSize: 18, color: colors.text },
  summary: { marginTop: 3, fontSize: 13, color: colors.textSec, lineHeight: 18, fontFamily: 'Inter_400Regular' },
  glyph: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  glyphText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
});
