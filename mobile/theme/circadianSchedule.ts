import type { CircadianAnchorId } from './circadianPalettes';
import { anchorById, blendAnchors } from './interpolateTheme';
import type { SkyAnchor } from './circadianPalettes';
import type { ThemeColors } from './circadianPalettes';
import { luminanceFromHex } from './interpolateTheme';
import { minutesSinceMidnight } from '../domain/sleepSchedule';

type Segment = {
  startMin: number;
  endMin: number;
  from: CircadianAnchorId;
  to: CircadianAnchorId;
  label: string;
};

const SEGMENTS: Segment[] = [
  { startMin: 0, endMin: 5 * 60, from: 'night', to: 'night', label: 'Night' },
  { startMin: 5 * 60, endMin: 8 * 60, from: 'night', to: 'sunriseSunset', label: 'Sunrise' },
  { startMin: 8 * 60, endMin: 10 * 60, from: 'sunriseSunset', to: 'day', label: 'Morning' },
  { startMin: 10 * 60, endMin: 17 * 60, from: 'day', to: 'day', label: 'Day' },
  { startMin: 17 * 60, endMin: 19 * 60 + 30, from: 'day', to: 'sunriseSunset', label: 'Sunset' },
  { startMin: 19 * 60 + 30, endMin: 21 * 60 + 30, from: 'sunriseSunset', to: 'night', label: 'Dusk' },
  { startMin: 21 * 60 + 30, endMin: 24 * 60, from: 'night', to: 'night', label: 'Night' },
];

export type CircadianSnapshot = {
  colors: ThemeColors;
  sky: SkyAnchor;
  phaseLabel: string;
  statusBarStyle: 'light' | 'dark';
  blendT: number;
};

function resolveSegment(min: number): { segment: Segment; t: number } {
  const m = ((min % 1440) + 1440) % 1440;
  for (const segment of SEGMENTS) {
    if (m >= segment.startMin && m < segment.endMin) {
      const span = segment.endMin - segment.startMin;
      const t = span <= 0 ? 0 : (m - segment.startMin) / span;
      return { segment, t };
    }
  }
  return { segment: SEGMENTS[0], t: 0 };
}

export function getCircadianSnapshotAtMinutes(minutesSinceMidnight: number): CircadianSnapshot {
  const { segment, t } = resolveSegment(minutesSinceMidnight);
  const from = anchorById(segment.from);
  const to = anchorById(segment.to);
  const { ui, sky } = blendAnchors(from, to, t);
  const lum = luminanceFromHex(ui.bg);
  return {
    colors: ui,
    sky,
    phaseLabel: segment.label,
    statusBarStyle: lum > 0.42 ? 'dark' : 'light',
    blendT: t,
  };
}

export function getCircadianSnapshot(now: Date = new Date()): CircadianSnapshot {
  return getCircadianSnapshotAtMinutes(minutesSinceMidnight(now));
}

export const CIRCADIAN_DEBUG_PRESETS = [
  { label: 'Night', minutes: 2 * 60 },
  { label: 'Sunrise', minutes: 6 * 60 + 30 },
  { label: 'Day', minutes: 12 * 60 },
  { label: 'Sunset', minutes: 18 * 60 + 15 },
  { label: 'Dusk', minutes: 20 * 60 + 30 },
] as const;
