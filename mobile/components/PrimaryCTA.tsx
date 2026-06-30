import { Pressable, Text, StyleSheet, ViewStyle, StyleProp, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { fonts } from '../theme/tokens';
import { useCircadianColors } from '../theme/CircadianThemeProvider';

type Props = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  variant?: 'gradient' | 'glassDark';
};

const FILL = ['#383442', '#2C2834'] as const;
const FILL_DISABLED = ['#2E3038', '#26282E'] as const;

export function PrimaryCTA({
  label,
  onPress,
  disabled = false,
  loading = false,
  style,
  variant = 'glassDark',
}: Props) {
  const colors = useCircadianColors();
  const inactive = disabled || loading;

  const labelNode = loading ? (
    <ActivityIndicator size="small" color={colors.text} />
  ) : (
    <Text style={[styles.label, inactive && { color: colors.textTer }]}>{label}</Text>
  );

  if (variant === 'gradient') {
    return (
      <Pressable
        onPress={inactive ? undefined : onPress}
        disabled={inactive}
        style={({ pressed }) => [
          styles.hit,
          !inactive && {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: pressed ? 0.22 : 0.32,
            shadowRadius: 10,
            elevation: pressed ? 4 : 6,
            transform: [{ scale: pressed ? 0.985 : 1 }],
          },
          inactive && { elevation: 0, shadowOpacity: 0 },
          style,
        ]}
      >
        <LinearGradient
          colors={[...(inactive ? FILL_DISABLED : FILL)]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.fill}
        >
          {labelNode}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={inactive ? undefined : onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.hit,
        styles.hitGlass,
        !inactive && {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: pressed ? 0.18 : 0.26,
          shadowRadius: 8,
          elevation: pressed ? 3 : 5,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        inactive && { elevation: 0, shadowOpacity: 0, opacity: 0.55 },
        style,
      ]}
    >
      <BlurView
        intensity={18}
        tint="dark"
        style={[styles.glassDarkFill, inactive && styles.glassDarkFillDisabled]}
      >
        {labelNode}
      </BlurView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  hitGlass: {
    borderColor: 'rgba(255,255,255,0.22)',
  },
  glassDarkFill: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: 'rgba(92,92,96,0.72)',
    overflow: 'hidden',
  },
  glassDarkFillDisabled: {
    backgroundColor: 'rgba(62,62,66,0.5)',
  },
  fill: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  label: {
    fontFamily: fonts.bodyS,
    fontSize: 16,
    letterSpacing: 0.2,
    color: 'rgba(245,245,247,0.92)',
  },
});
