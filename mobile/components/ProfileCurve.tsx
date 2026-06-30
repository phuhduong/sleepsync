import Svg, { Defs, LinearGradient, Stop, Path, G, Circle } from 'react-native-svg';
import { hexToRgb } from '../theme/tokens';
import { useCircadianColors } from '../theme/CircadianThemeProvider';
import { lerpAtT, smoothPathFromPoints } from '../domain/curveMath';
import type { Keyframe } from '../domain/profiles';

type Props = {
  keyframes: Keyframe[];
  width?: number;
  height?: number;
  currentT?: number | null;
  mini?: boolean;
};

let gradIdCounter = 0;

export const PROFILE_CURVE_PAD_X = 12;

export function ProfileCurve({
  keyframes,
  width = 330,
  height = 140,
  currentT = null,
  mini = false,
}: Props) {
  const colors = useCircadianColors();
  const pad = { top: 12, right: PROFILE_CURVE_PAD_X, bottom: 12, left: PROFILE_CURVE_PAD_X };
  const W = width - pad.left - pad.right;
  const H = height - pad.top - pad.bottom;
  const toX = (t: number) => pad.left + t * W;
  const toY = (d: number) => pad.top + (1 - d) * H;

  const pts = keyframes.map(kf => [toX(kf.t), toY(kf.dose)] as [number, number]);
  const d = smoothPathFromPoints(pts);
  const fillD =
    d + ` L${pts[pts.length - 1][0]},${pad.top + H} L${pts[0][0]},${pad.top + H} Z`;

  let curX = 0;
  let curY = 0;
  if (currentT !== null) {
    curX = toX(currentT);
    curY = toY(lerpAtT(keyframes.map((kf) => ({ t: kf.t, value: kf.dose })), currentT));
  }

  const gradId = `cg${++gradIdCounter}`;
  const [ar, ag, ab] = hexToRgb(colors.accent);
  const accentMid = `rgba(${ar},${ag},${ab},0.35)`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={colors.accent} stopOpacity={mini ? 0.18 : 0.28} />
          <Stop offset="100%" stopColor={colors.accent} stopOpacity={0.02} />
        </LinearGradient>
      </Defs>
      <Path d={fillD} fill={`url(#${gradId})`} />
      <Path
        d={d}
        fill="none"
        stroke={colors.accent}
        strokeWidth={mini ? 1.5 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {currentT !== null && (
        <G>
          <Circle cx={curX} cy={curY} r={4} fill={colors.accent} />
          <Circle cx={curX} cy={curY} r={7} fill="none" stroke={accentMid} strokeWidth={1.5} />
        </G>
      )}
    </Svg>
  );
}
