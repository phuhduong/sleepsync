import Svg, { Line, Path } from 'react-native-svg';
import { useCircadianColors } from '../theme/CircadianThemeProvider';
import { smoothPathFromPoints } from '../domain/curveMath';

type Props = {
  data: number[];
  width?: number;
  height?: number;
  showBaseline?: boolean;
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

  const series = data.length === 1 ? [data[0], data[0]] : data;
  const xStep = width / (series.length - 1);
  const pts = series.map((v, i) => [i * xStep, yFor(v)] as [number, number]);
  const d = smoothPathFromPoints(pts);

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
