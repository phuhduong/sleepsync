export const colors = {
  bg:        '#0A0B0F',
  surface:   '#14161C',
  surface2:  '#1C1F28',
  surface3:  '#22252F',
  border:    'rgba(255,255,255,0.08)',
  borderMid: 'rgba(255,255,255,0.12)',
  text:      '#F5F5F7',
  textSec:   'rgba(245,245,247,0.55)',
  textTer:   'rgba(245,245,247,0.38)',
  accent:    '#7B5CF0',
  accentDim: 'rgba(123,92,240,0.12)',
  accentMid: 'rgba(123,92,240,0.28)',
  accentGlow:'rgba(123,92,240,0.5)',
  danger:    '#E05656',
  dangerDim: 'rgba(224,86,86,0.55)',
} as const;

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

export const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
};

export const rgba = (hex: string, alpha: number): string => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
};
