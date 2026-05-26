import { ProfileCurve } from './ProfileCurve';
import type { RiskPoint } from '../utils/apiTypes';
import { riskPointsToKeyframes } from '../utils/riskCurvePath';

type Props = {
  points: RiskPoint[];
  width: number;
  height?: number;
};

/** Wake-risk over bed→wake — same chart style as delivery (ProfileCurve). */
export function RiskCurveChart({ points, width, height = 120 }: Props) {
  const keyframes = riskPointsToKeyframes(points);
  if (keyframes.length < 2) return null;
  return <ProfileCurve keyframes={keyframes} width={width} height={height} />;
}
