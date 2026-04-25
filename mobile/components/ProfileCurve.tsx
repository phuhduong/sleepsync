import Svg, { Defs, LinearGradient, Stop, Path, G, Circle, Text as SvgText } from 'react-native-svg';
import { colors, hexToRgb } from '../theme/tokens';
import type { Keyframe } from '../utils/profiles';

type Props = {
  keyframes: Keyframe[];
  width?: number;
  height?: number;
  showLabels?: boolean;
  currentT?: number | null;
  mini?: boolean;
};

let gradIdCounter = 0;

export function ProfileCurve({
  keyframes,
  width = 330,
  height = 140,
  showLabels = true,
  currentT = null,
  mini = false,
}: Props) {
  const pad = { top: 12, right: 12, bottom: showLabels ? 28 : 12, left: 12 };
  const W = width - pad.left - pad.right;
  const H = height - pad.top - pad.bottom;
  const toX = (t: number) => pad.left + t * W;
  const toY = (d: number) => pad.top + (1 - d) * H;

  const pts = keyframes.map(kf => [toX(kf.t), toY(kf.dose)] as [number, number]);
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cpx = (x0 + x1) / 2;
    d += ` C${cpx},${y0} ${cpx},${y1} ${x1},${y1}`;
  }
  const fillD =
    d + ` L${pts[pts.length - 1][0]},${pad.top + H} L${pts[0][0]},${pad.top + H} Z`;

  const labelKfs = keyframes.filter(kf => kf.label);
  const labelNodes: { x: number; y: number; label: string }[] = [];
  {
    let prevX = -999;
    for (const kf of labelKfs) {
      const x = toX(kf.t);
      const tooClose = x - prevX < 54;
      const y = tooClose ? height - 18 : height - 4;
      prevX = tooClose ? prevX : x;
      labelNodes.push({ x, y, label: kf.label! });
    }
  }

  let curX = 0;
  let curY = 0;
  if (currentT !== null) {
    curX = toX(currentT);
    let dose = 0;
    for (let i = 1; i < keyframes.length; i++) {
      if (currentT <= keyframes[i].t) {
        const a = keyframes[i - 1];
        const b = keyframes[i];
        const f = (currentT - a.t) / (b.t - a.t);
        dose = a.dose + f * (b.dose - a.dose);
        break;
      }
    }
    curY = toY(dose);
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
      {showLabels &&
        labelNodes.map((n, i) => (
          <SvgText
            key={i}
            x={n.x}
            y={n.y}
            textAnchor="middle"
            fill="rgba(245,245,247,0.35)"
            fontSize={9}
            fontWeight="600"
            letterSpacing={0.7}
          >
            {n.label.toUpperCase()}
          </SvgText>
        ))}
      {currentT !== null && (
        <G>
          <Circle cx={curX} cy={curY} r={4} fill={colors.accent} />
          <Circle cx={curX} cy={curY} r={7} fill="none" stroke={accentMid} strokeWidth={1.5} />
        </G>
      )}
    </Svg>
  );
}
