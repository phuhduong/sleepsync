import type { RiskPoint } from '../services/apiTypes';
import { lerpAtT } from './curveMath';
import type { Keyframe } from './profiles';

function riskAtT(points: RiskPoint[], t: number): number {
  return lerpAtT(
    points.map((p) => ({ t: p.t, value: p.p })),
    t,
  );
}

export function riskPointsToKeyframes(points: RiskPoint[], samples = 48): Keyframe[] {
  if (!points.length) return [];
  const n = Math.max(samples, 2);
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    return { t, dose: riskAtT(points, t) };
  });
}
