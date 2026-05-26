import type { RiskPoint } from './apiTypes';
import type { Keyframe } from './profiles';

/** Linear interpolate risk score at normalized time t ∈ [0, 1]. */
export function riskAtT(points: RiskPoint[], t: number): number {
  if (!points.length) return 0;
  const sorted = [...points].sort((a, b) => a.t - b.t);
  if (t <= sorted[0].t) return sorted[0].p;
  if (t >= sorted[sorted.length - 1].t) return sorted[sorted.length - 1].p;
  for (let i = 1; i < sorted.length; i++) {
    if (t <= sorted[i].t) {
      const a = sorted[i - 1];
      const b = sorted[i];
      const span = b.t - a.t || 1;
      const f = (t - a.t) / span;
      return a.p + f * (b.p - a.p);
    }
  }
  return sorted[sorted.length - 1].p;
}

/** Risk grid as keyframes so ProfileCurve can render it (same visual as delivery). */
export function riskPointsToKeyframes(points: RiskPoint[], samples = 48): Keyframe[] {
  return sampleRiskCurve(points, samples).map((s) => ({ t: s.t, dose: s.p }));
}

/** Dense, evenly spaced samples for smooth SVG rendering. */
export function sampleRiskCurve(points: RiskPoint[], samples = 160): { t: number; p: number }[] {
  if (!points.length) return [];
  const n = Math.max(samples, 2);
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    return { t, p: riskAtT(points, t) };
  });
}
