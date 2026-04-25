import { View, Text, TextStyle, ViewStyle, StyleProp } from 'react-native';
import { colors } from '../theme/tokens';
import { SmallCapsLabel } from './SmallCapsLabel';

type Props = {
  value: string | number;
  label: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function StatNumber({ value, label, size = 52, style }: Props) {
  return (
    <View style={[{ alignItems: 'center' }, style]}>
      <Text
        style={{
          fontFamily: 'Inter_600SemiBold',
          fontSize: size,
          color: colors.text,
          lineHeight: size,
          letterSpacing: -0.5,
          fontVariant: ['tabular-nums'],
        } as TextStyle}
      >
        {value}
      </Text>
      <SmallCapsLabel style={{ marginTop: 6, textAlign: 'center' }}>{label}</SmallCapsLabel>
    </View>
  );
}
