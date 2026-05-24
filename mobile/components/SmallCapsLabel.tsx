import { Text, TextStyle, StyleProp } from 'react-native';
import { fonts } from '../theme/tokens';
import { useCircadianColors } from '../theme/CircadianThemeProvider';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
};

export function SmallCapsLabel({ children, style }: Props) {
  const colors = useCircadianColors();
  return (
    <Text
      style={[
        {
          fontFamily: fonts.bodyM,
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
