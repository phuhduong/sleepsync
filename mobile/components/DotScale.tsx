import { Pressable, Text, View, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme/tokens';

type Props = {
  value: number | null;
  max?: number;
  onChange?: (n: number) => void;
  /** No press; use on history / read-only surfaces */
  readOnly?: boolean;
};

export function DotScale({ value, max = 5, onChange, readOnly }: Props) {
  return (
    <View style={styles.row}>
      {Array.from({ length: max }, (_, i) => i + 1).map(n => {
        const filled = value !== null && n <= value;
        const dotStyle = [
          styles.dot,
          { backgroundColor: filled ? colors.accent : 'rgba(255,255,255,0.07)' },
        ];
        const label = (
          <Text style={[styles.num, { color: filled ? '#fff' : colors.textSec }]}>{n}</Text>
        );
        if (readOnly) {
          return (
            <View key={n} style={dotStyle}>
              {label}
            </View>
          );
        }
        return (
          <Pressable
            key={n}
            onPress={() => onChange?.(n)}
            style={dotStyle}
          >
            {label}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  dot: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  num: { fontFamily: fonts.bodyM, fontSize: 14 },
});
