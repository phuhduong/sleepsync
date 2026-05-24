export { NIGHT_COLORS, colors, type ThemeColors } from './circadianPalettes';
export { hexToRgb, rgba } from './colorUtils';

export const fonts = {
  body:  'OpenSans_400Regular',
  bodyM: 'OpenSans_500Medium',
  bodyS: 'OpenSans_600SemiBold',
  hero:  'CormorantGaramond_600SemiBold',
} as const;

export const fontSize = {
  display: 56,
  hero:    44,
  heading: 28,
  body:    18,
  caption: 14,
  micro:   11,
} as const;
