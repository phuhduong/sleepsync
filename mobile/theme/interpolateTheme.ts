import type { CircadianAnchor, CircadianAnchorId, SkyAnchor, ThemeColors, UiAnchor } from './circadianPalettes';
import { CIRCADIAN_ANCHORS, SEMANTIC_COLORS } from './circadianPalettes';
import { hexToRgb } from './colorUtils';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRgbTuple(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function lerpHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const r = Math.round(lerp(ar, br, t));
  const g = Math.round(lerp(ag, bg, t));
  const bl = Math.round(lerp(ab, bb, t));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
}

function lerpRgbaString(a: string, b: string, t: number): string {
  const parse = (s: string) => {
    const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!m) return { r: 0, g: 0, b: 0, alpha: 1 };
    return {
      r: Number(m[1]),
      g: Number(m[2]),
      b: Number(m[3]),
      alpha: m[4] !== undefined ? Number(m[4]) : 1,
    };
  };
  const pa = parse(a);
  const pb = parse(b);
  const r = Math.round(lerp(pa.r, pb.r, t));
  const g = Math.round(lerp(pa.g, pb.g, t));
  const bl = Math.round(lerp(pa.b, pb.b, t));
  const alpha = lerp(pa.alpha, pb.alpha, t);
  return `rgba(${r},${g},${bl},${alpha.toFixed(3)})`;
}

function lerpColorString(a: string, b: string, t: number): string {
  if (a.startsWith('#') && b.startsWith('#')) return lerpHex(a, b, t);
  if (a.startsWith('rgba') && b.startsWith('rgba')) return lerpRgbaString(a, b, t);
  return t < 0.5 ? a : b;
}

function lerpUi(from: UiAnchor, to: UiAnchor, t: number): UiAnchor {
  return {
    bg: lerpColorString(from.bg, to.bg, t),
    gutter: lerpColorString(from.gutter, to.gutter, t),
    surface: lerpColorString(from.surface, to.surface, t),
    surface2: lerpColorString(from.surface2, to.surface2, t),
    surface3: lerpColorString(from.surface3, to.surface3, t),
    border: lerpColorString(from.border, to.border, t),
    borderMid: lerpColorString(from.borderMid, to.borderMid, t),
    text: lerpColorString(from.text, to.text, t),
    textSec: lerpColorString(from.textSec, to.textSec, t),
    textTer: lerpColorString(from.textTer, to.textTer, t),
    accent: lerpColorString(from.accent, to.accent, t),
    accentDim: lerpColorString(from.accentDim, to.accentDim, t),
    accentMid: lerpColorString(from.accentMid, to.accentMid, t),
    accentGlow: lerpColorString(from.accentGlow, to.accentGlow, t),
  };
}

function lerpSky(from: SkyAnchor, to: SkyAnchor, t: number): SkyAnchor {
  return {
    zenith: lerpRgbTuple(from.zenith, to.zenith, t),
    horizon: lerpRgbTuple(from.horizon, to.horizon, t),
    cloud: lerpRgbTuple(from.cloud, to.cloud, t),
  };
}

export function blendAnchors(from: CircadianAnchor, to: CircadianAnchor, t: number): {
  ui: ThemeColors;
  sky: SkyAnchor;
} {
  const k = Math.min(1, Math.max(0, t));
  return {
    ui: { ...lerpUi(from.ui, to.ui, k), ...SEMANTIC_COLORS },
    sky: lerpSky(from.sky, to.sky, k),
  };
}

export function anchorById(id: CircadianAnchorId): CircadianAnchor {
  return CIRCADIAN_ANCHORS[id];
}

export function luminanceFromHex(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  const srgb = [r, g, b].map((c) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}
