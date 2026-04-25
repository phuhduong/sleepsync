import { Pressable, Text, StyleSheet, View, ViewStyle, StyleProp, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { colors, hexToRgb } from '../theme/tokens';

type Props = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryCTA({ label, onPress, disabled = false, style }: Props) {
  const [pressed, setPressed] = useState(false);
  const [r, g, b] = hexToRgb(colors.accent);

  const bg = disabled
    ? `rgba(${r},${g},${b},0.15)`
    : `rgba(${r},${g},${b},0.32)`;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={disabled}
      style={[
        styles.base,
        {
          backgroundColor: bg,
          borderColor: `rgba(255,255,255,${disabled ? 0.07 : 0.18})`,
          transform: [{ scale: pressed && !disabled ? 0.96 : 1 }],
          shadowColor: disabled ? '#000' : colors.accent,
          shadowOpacity: disabled ? 0 : 0.38,
          shadowRadius: disabled ? 0 : 14,
          shadowOffset: { width: 0, height: 4 },
          elevation: disabled ? 0 : 8,
        },
        style,
      ]}
    >
      {!disabled && (
        <LinearGradient
          colors={['rgba(255,255,255,0.13)', 'rgba(255,255,255,0)']}
          style={styles.sheen}
          pointerEvents="none"
        />
      )}
      <Text style={[styles.label, { color: disabled ? 'rgba(255,255,255,0.4)' : '#fff' }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: colors.accent },
      default: {},
    }),
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '52%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    letterSpacing: 0.2,
  },
});
