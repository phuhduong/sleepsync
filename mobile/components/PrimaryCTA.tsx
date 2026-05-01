import { Pressable, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { colors, fonts } from '../theme/tokens';

type Props = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Pill gradient (legacy), or frosted neutral-grey glass (default — matches Tonight CTA). */
  variant?: 'gradient' | 'glassDark';
};

/** Dark warm gray → slightly deeper plum-gray; purple is ambient, not loud. */
const FILL = ['#383442', '#2C2834'] as const;
const FILL_DISABLED = ['#2E3038', '#26282E'] as const;

/**
 * Primary CTA — default is frosted neutral-grey glass (`glassDark`). Pass `variant="gradient"` for the legacy plum-gray gradient pill.
 */
export function PrimaryCTA({ label, onPress, disabled = false, style, variant = 'glassDark' }: Props) {
  if (variant === 'gradient') {
    return (
      <Pressable
        onPress={disabled ? undefined : onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.hit,
          !disabled && {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: pressed ? 0.22 : 0.32,
            shadowRadius: 10,
            elevation: pressed ? 4 : 6,
            transform: [{ scale: pressed ? 0.985 : 1 }],
          },
          disabled && { elevation: 0, shadowOpacity: 0 },
          style,
        ]}
      >
        <LinearGradient
          colors={[...(disabled ? FILL_DISABLED : FILL)]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.fill}
        >
          <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.hit,
        styles.hitGlass,
        !disabled && {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: pressed ? 0.18 : 0.26,
          shadowRadius: 8,
          elevation: pressed ? 3 : 5,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        disabled && { elevation: 0, shadowOpacity: 0, opacity: 0.55 },
        style,
      ]}
    >
      <BlurView intensity={18} tint="dark" style={[styles.glassDarkFill, disabled && styles.glassDarkFillDisabled]}>
        <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
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
    /* Neutral grey — lighter than the sheet so the CTA reads as the obvious tap target. */
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
  labelDisabled: {
    color: colors.textTer,
  },
});
