import Svg, { Line, Path } from 'react-native-svg';
import { useCircadianColors } from '../theme/CircadianThemeProvider';

type Props = {
  data: number[];
  width?: number;
  height?: number;
  /** Faint horizontal baseline at the bottom of the plot area. */
  showBaseline?: boolean;
};

export function SparkLine({ data, width = 320, height = 44, showBaseline = false }: Props) {
  const colors = useCircadianColors();
  if (!data.length) return null;
  const padY = 6;
  const plotH = height - padY * 2;
  const baselineY = height - padY;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const xStep = width / (data.length - 1);
  const pts = data.map(
    (v, i) => [i * xStep, padY + plotH - ((v - min) / range) * plotH] as [number, number],
  );

  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cpx = (x0 + x1) / 2;
    d += ` C${cpx},${y0} ${cpx},${y1} ${x1},${y1}`;
  }

  return (
    <Svg width={width} height={height}>
      {showBaseline ? (
        <Line
          x1={0}
          y1={baselineY}
          x2={width}
          y2={baselineY}
          stroke={colors.border}
          strokeWidth={1}
        />
      ) : null}
      <Path
        d={d}
        fill="none"
        stroke={colors.accent}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
