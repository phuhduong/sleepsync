import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, LinearGradient, Rect, Circle, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';

const AnimatedG = Animated.createAnimatedComponent(G);

type Blob = {
  cx: number;
  cy: number;
  r: number;
  color: string;
  opacity: number;
  ax: number;
  ay: number;
  phase: number;
};

const BLOBS: Blob[] = [
  { cx: 0.28, cy: 0.22, r: 0.58, color: 'rgb(85,38,215)',  opacity: 0.72, ax: 0.13, ay: 0.10, phase: 0.0 },
  { cx: 0.72, cy: 0.18, r: 0.50, color: 'rgb(58,18,195)',  opacity: 0.62, ax: 0.13, ay: 0.10, phase: 2.1 },
  { cx: 0.50, cy: 0.52, r: 0.54, color: 'rgb(38,12,165)',  opacity: 0.52, ax: 0.13, ay: 0.10, phase: 4.3 },
  { cx: 0.15, cy: 0.38, r: 0.40, color: 'rgb(108,32,235)', opacity: 0.46, ax: 0.13, ay: 0.10, phase: 1.5 },
  { cx: 0.82, cy: 0.42, r: 0.36, color: 'rgb(68,22,185)',  opacity: 0.44, ax: 0.13, ay: 0.10, phase: 3.0 },
];

type Props = { width: number; height: number };

function AnimatedBlob({ blob, t, W, H }: { blob: Blob; t: SharedValue<number>; W: number; H: number }) {
  const minDim = Math.min(W, H);
  const radius = blob.r * minDim * 1.6;
  const id = `blob-${blob.phase}-${blob.cx}`;

  const animatedProps = useAnimatedProps(() => {
    const x = (blob.cx + Math.sin(t.value + blob.phase) * blob.ax) * W;
    const y = (blob.cy + Math.cos(t.value * 0.75 + blob.phase) * blob.ay) * H;
    return { cx: x, cy: y };
  });

  return (
    <>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0%"   stopColor={blob.color} stopOpacity={blob.opacity} />
          <Stop offset="40%"  stopColor={blob.color} stopOpacity={blob.opacity * 0.42} />
          <Stop offset="100%" stopColor={blob.color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <AnimatedCircle animatedProps={animatedProps} r={radius} fill={`url(#${id})`} />
    </>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function BackgroundCanvas({ width, height }: Props) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(
      withTiming(Math.PI * 2, { duration: 28000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [t]);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#07080C' }]} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="vignette" x1="0" y1="0.28" x2="0" y2="1">
            <Stop offset="0"    stopColor="#07080C" stopOpacity={0} />
            <Stop offset="0.42" stopColor="#07080C" stopOpacity={0.6} />
            <Stop offset="0.72" stopColor="#07080C" stopOpacity={0.9} />
            <Stop offset="1"    stopColor="#07080C" stopOpacity={0.97} />
          </LinearGradient>
        </Defs>
        {BLOBS.map((blob, i) => (
          <AnimatedBlob key={i} blob={blob} t={t} W={width} H={height} />
        ))}
        <Rect x={0} y={0} width={width} height={height} fill="url(#vignette)" />
      </Svg>
    </View>
  );
}
