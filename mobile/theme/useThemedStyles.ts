import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import type { ThemeColors } from './circadianPalettes';
import { useCircadianColors } from './CircadianThemeProvider';

export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (colors: ThemeColors) => T,
): T {
  const colors = useCircadianColors();
  return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
}
