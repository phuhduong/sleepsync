import { Pressable, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, fonts } from '../theme/tokens';

type Props = {
  onPress: () => void;
  label?: string;
};

export function BackButton({ onPress, label = 'Back' }: Props) {
  return (
    <Pressable onPress={onPress} style={styles.btn} hitSlop={8}>
      <Svg width={8} height={13} viewBox="0 0 8 13" fill="none">
        <Path d="M7 1L1 6.5L7 12" stroke={colors.textSec} strokeWidth={1.8}
          strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: fonts.bodyM,
    fontSize: 14,
    color: colors.textSec,
  },
});
