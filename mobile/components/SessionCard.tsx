import { Pressable, Text, View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { fonts } from '../theme/tokens';
import { useCircadianColors } from '../theme/CircadianThemeProvider';
import { SmallCapsLabel } from './SmallCapsLabel';
import type { SessionRecord } from '../utils/profiles';

type Props = {
  session: SessionRecord;
  onPress: () => void;
};

export function SessionCard({ session, onPress }: Props) {
  const colors = useCircadianColors();
  const good = session.outcome === 'good';
  const glyphColor = good ? colors.accent : 'rgba(245,245,247,0.4)';
  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={{ flex: 1 }}>
        <SmallCapsLabel style={{ marginBottom: 4 }}>{session.date}</SmallCapsLabel>
        <Text style={[styles.title, { color: colors.text }]}>{session.profile}</Text>
        <Text style={[styles.summary, { color: colors.textSec }]}>{session.summary}</Text>
      </View>
      <View
        style={[
          styles.glyph,
          { backgroundColor: good ? colors.accentDim : 'rgba(255,255,255,0.06)' },
        ]}
      >
        <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
          {good ? (
            <Path d="M3 7.5L6 10.5L11 4.5" stroke={glyphColor} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <Path d="M3.5 7H10.5" stroke={glyphColor} strokeWidth={1.8} strokeLinecap="round" />
          )}
        </Svg>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  title: { fontFamily: fonts.bodyM, fontSize: 18 },
  summary: { marginTop: 3, fontSize: 14, lineHeight: 20, fontFamily: fonts.body },
  glyph: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
