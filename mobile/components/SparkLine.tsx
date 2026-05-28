import Svg, { Line, Path } from 'react-native-svg';
import { useCircadianColors } from '../theme/CircadianThemeProvider';

type Props = {
  data: number[];
  width?: number;
  height?: number;
  /** Faint horizontal baseline at the bottom of the plot area. */
  showBaseline?: boolean;
  /** Fixed Y scale (e.g. grogginess 1–5). Defaults to data min/max. */
  valueMin?: number;
  valueMax?: number;
};

export function SparkLine({
  data,
  width = 320,
  height = 44,
  showBaseline = false,
  valueMin,
  valueMax,
}: Props) {
  const colors = useCircadianColors();
  if (!data.length) return null;

  const padY = 6;
  const plotH = height - padY * 2;
  const baselineY = height - padY;
  const scaleMin = valueMin ?? Math.min(...data);
  const scaleMax = valueMax ?? Math.max(...data);
  const range = scaleMax - scaleMin || 1;
  const yFor = (v: number) => padY + plotH - ((v - scaleMin) / range) * plotH;

  // One night → flat segment across the chart (same path style as multi-night).
  const series = data.length === 1 ? [data[0], data[0]] : data;
  const xStep = width / (series.length - 1);
  const pts = series.map((v, i) => [i * xStep, yFor(v)] as [number, number]);

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
