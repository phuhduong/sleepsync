import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { colors } from '../theme/tokens';

type Props = {
  width: number;
  height: number;
};

export function LiveAmbient({ width, height }: Props) {
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }}>
      <Defs>
        <RadialGradient id="liveAmbient" cx="50%" cy="42%" rx="78%" ry="62%" fx="50%" fy="42%">
          <Stop offset="0%"   stopColor={colors.accent} stopOpacity={0.28} />
          <Stop offset="38%"  stopColor={colors.accent} stopOpacity={0.10} />
          <Stop offset="72%"  stopColor={colors.accent} stopOpacity={0.02} />
          <Stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width={width} height={height} fill="url(#liveAmbient)" />
    </Svg>
  );
}
