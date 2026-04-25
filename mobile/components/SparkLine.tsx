import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../theme/tokens';

type Props = {
  data: number[];
  width?: number;
  height?: number;
};

export function SparkLine({ data, width = 320, height = 40 }: Props) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const xStep = width / (data.length - 1);
  const pts = data.map((v, i) => [i * xStep, height - ((v - min) / range) * (height - 8) - 4] as [number, number]);

  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cpx = (x0 + x1) / 2;
    d += ` C${cpx},${y0} ${cpx},${y1} ${x1},${y1}`;
  }

  return (
    <Svg width={width} height={height}>
      <Path d={d} fill="none" stroke={colors.accent} strokeWidth={1.5} strokeLinecap="round" />
      {pts.map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={2.5} fill={colors.accent} opacity={0.7} />
      ))}
    </Svg>
  );
}
