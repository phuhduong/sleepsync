import { Pressable, Text, View, StyleSheet } from 'react-native';
import { colors } from '../theme/tokens';

type Props = {
  value: number | null;
  max?: number;
  onChange?: (n: number) => void;
};

export function DotScale({ value, max = 5, onChange }: Props) {
  return (
    <View style={styles.row}>
      {Array.from({ length: max }, (_, i) => i + 1).map(n => {
        const filled = value !== null && n <= value;
        return (
          <Pressable
            key={n}
            onPress={() => onChange?.(n)}
            style={[
              styles.dot,
              { backgroundColor: filled ? colors.accent : 'rgba(255,255,255,0.07)' },
            ]}
          >
            <Text style={[styles.num, { color: filled ? '#fff' : colors.textSec }]}>{n}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  dot: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  num: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
});
