import { Text, TextStyle, StyleProp } from 'react-native';
import { colors } from '../theme/tokens';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
};

export function SmallCapsLabel({ children, style }: Props) {
  return (
    <Text
      style={[
        {
          fontFamily: 'Inter_600SemiBold',
          fontSize: 11,
          letterSpacing: 1.1,
          textTransform: 'uppercase',
          color: colors.textTer,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
