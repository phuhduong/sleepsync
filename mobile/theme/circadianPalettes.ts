import { rgba } from './colorUtils';

/** UI + sky anchors for circadian blending (0–1 RGB triples for shader). */
export type CircadianAnchorId = 'night' | 'sunriseSunset' | 'day';

export type SkyAnchor = {
  zenith: [number, number, number];
  horizon: [number, number, number];
  cloud: [number, number, number];
};

export type UiAnchor = {
  bg: string;
  gutter: string;
  surface: string;
  surface2: string;
  surface3: string;
  border: string;
  borderMid: string;
  text: string;
  textSec: string;
  textTer: string;
  accent: string;
  accentDim: string;
  accentMid: string;
  accentGlow: string;
};

export type CircadianAnchor = {
  id: CircadianAnchorId;
  ui: UiAnchor;
  sky: SkyAnchor;
};

const nightAccent = '#7B5CF0';

export const CIRCADIAN_ANCHORS: Record<CircadianAnchorId, CircadianAnchor> = {
  night: {
    id: 'night',
    ui: {
      bg: '#0A0B0F',
      gutter: '#07080C',
      surface: '#14161C',
      surface2: '#1C1F28',
      surface3: '#22252F',
      border: 'rgba(255,255,255,0.08)',
      borderMid: 'rgba(255,255,255,0.12)',
      text: '#F5F5F7',
      textSec: 'rgba(245,245,247,0.55)',
      textTer: 'rgba(245,245,247,0.38)',
      accent: nightAccent,
      accentDim: rgba(nightAccent, 0.12),
      accentMid: rgba(nightAccent, 0.28),
      accentGlow: rgba(nightAccent, 0.5),
    },
    sky: {
      zenith: [0.022, 0.028, 0.055],
      horizon: [0.048, 0.058, 0.105],
      cloud: [0.14, 0.11, 0.22],
    },
  },
  sunriseSunset: {
    id: 'sunriseSunset',
    ui: {
      bg: '#1A120E',
      gutter: '#120C08',
      surface: '#2A1C14',
      surface2: '#352418',
      surface3: '#3F2C1E',
      border: 'rgba(255,220,180,0.1)',
      borderMid: 'rgba(255,220,180,0.14)',
      text: '#F5F0EB',
      textSec: 'rgba(245,240,235,0.58)',
      textTer: 'rgba(245,240,235,0.4)',
      accent: '#E8A04A',
      accentDim: 'rgba(232,160,74,0.14)',
      accentMid: 'rgba(232,160,74,0.32)',
      accentGlow: 'rgba(232,160,74,0.48)',
    },
    sky: {
      zenith: [0.12, 0.06, 0.08],
      horizon: [0.38, 0.16, 0.1],
      cloud: [0.28, 0.14, 0.12],
    },
  },
  day: {
    id: 'day',
    ui: {
      bg: '#14355A',
      gutter: '#0C2440',
      surface: '#1A4268',
      surface2: '#1F4D78',
      surface3: '#255888',
      border: 'rgba(220,240,255,0.12)',
      borderMid: 'rgba(220,240,255,0.16)',
      text: '#F5F8FC',
      textSec: 'rgba(245,248,252,0.62)',
      textTer: 'rgba(245,248,252,0.42)',
      accent: '#5EB0E8',
      accentDim: 'rgba(94,176,232,0.14)',
      accentMid: 'rgba(94,176,232,0.3)',
      accentGlow: 'rgba(94,176,232,0.5)',
    },
    sky: {
      zenith: [0.18, 0.42, 0.72],
      horizon: [0.32, 0.58, 0.88],
      cloud: [0.82, 0.9, 0.98],
    },
  },
};

/** Fixed semantic colors (not circadian). */
export const SEMANTIC_COLORS = {
  danger: '#E05656',
  dangerDim: 'rgba(224,86,86,0.55)',
} as const;

export type ThemeColors = UiAnchor & typeof SEMANTIC_COLORS;

export const NIGHT_COLORS: ThemeColors = {
  ...CIRCADIAN_ANCHORS.night.ui,
  ...SEMANTIC_COLORS,
};

