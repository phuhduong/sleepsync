import { Pressable, Text, View, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme/tokens';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: Option<T>[];
  value: T | null;
  onChange: (v: T) => void;
};

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View style={styles.wrap}>
      {options.map(opt => {
        const sel = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.seg,
              sel && {
                backgroundColor: colors.surface2,
                shadowColor: '#000',
                shadowOpacity: 0.35,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 1 },
                elevation: 2,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                {
                  fontFamily: sel ? fonts.bodyM : fonts.body,
                  color: sel ? colors.text : colors.textSec,
                },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  seg: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
  },
});
