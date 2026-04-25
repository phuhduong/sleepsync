import { Pressable, View, Animated, Easing, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { useEffect, useRef } from 'react';

type Props = {
  dose: number;
  isActive?: boolean;
  onPress?: () => void;
  size?: number;
};

export function PatchSimulator({ dose = 0.5, isActive = true, onPress, size = 200 }: Props) {
  const d2 = dose * dose;
  const br = Math.round(size * 0.17);

  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!isActive || dose <= 0.05) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.78, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isActive, dose, pulse]);

  // Glow layers — stacked concentric rounded squares, each slightly larger and blurred via radius.
  // RN only renders one shadow per View, so we stack three views to fake a layered glow.
  const glow = (spread: number, opacity: number, radius: number): ViewStyle => ({
    position: 'absolute',
    width: size + spread * 2,
    height: size + spread * 2,
    left: -spread,
    top: -spread,
    borderRadius: br + spread,
    shadowColor: '#7B5CF0',
    shadowOpacity: opacity,
    shadowRadius: radius,
    shadowOffset: { width: 0, height: 0 },
    elevation: Math.round(radius),
  });

  const patchBgColors = [
    'rgba(34,28,60,0.97)',
    'rgba(18,14,38,0.99)',
    'rgba(28,22,52,0.97)',
  ] as const;

  return (
    <Animated.View style={{ width: size, height: size, opacity: pulse }}>
      <View style={glow(0, d2 * 0.88, Math.max(8, d2 * 44))} />
      <View style={glow(0, d2 * 0.48, Math.max(12, d2 * 72))} />
      <View style={glow(0, d2 * 0.20, Math.max(16, d2 * 100))} />

      <Pressable
        onPress={onPress}
        style={{
          width: size,
          height: size,
          borderRadius: br,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: `rgba(255,255,255,${0.04 + dose * 0.09})`,
        }}
      >
        <LinearGradient
          colors={patchBgColors}
          locations={[0, 0.55, 1]}
          start={{ x: 0.18, y: 0.06 }}
          end={{ x: 0.82, y: 0.94 }}
          style={{ width: '100%', height: '100%' }}
        >
          {/* Adhesive border ring */}
          <View
            style={{
              position: 'absolute',
              top: Math.round(size * 0.08),
              left: Math.round(size * 0.08),
              right: Math.round(size * 0.08),
              bottom: Math.round(size * 0.08),
              borderRadius: Math.round(br * 0.65),
              borderWidth: 1,
              borderColor: `rgba(123,92,240,${0.05 + d2 * 0.35})`,
            }}
          />

          {/* Delivery membrane — the glowing inset window */}
          <View
            style={{
              position: 'absolute',
              top: Math.round(size * 0.2),
              left: Math.round(size * 0.2),
              right: Math.round(size * 0.2),
              bottom: Math.round(size * 0.2),
            }}
          >
            <Svg width="100%" height="100%">
              <Defs>
                <RadialGradient id="membrane" cx="38%" cy="32%" rx="75%" ry="75%" fx="38%" fy="32%">
                  <Stop offset="0%"   stopColor="rgb(165,125,255)" stopOpacity={d2 * 0.52} />
                  <Stop offset="35%"  stopColor="rgb(123,92,240)"  stopOpacity={d2 * 0.68} />
                  <Stop offset="68%"  stopColor="rgb(70,40,180)"   stopOpacity={d2 * 0.38} />
                  <Stop offset="100%" stopColor="rgb(18,14,38)"    stopOpacity={0.65} />
                </RadialGradient>
              </Defs>
              <Rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                rx={Math.round(br * 0.42)}
                ry={Math.round(br * 0.42)}
                fill="url(#membrane)"
                stroke={`rgba(123,92,240,${0.04 + d2 * 0.42})`}
                strokeWidth={1}
              />
            </Svg>
          </View>

          {/* Center luminance node */}
          <View
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: Math.round(size * 0.065),
              height: Math.round(size * 0.065),
              marginLeft: -Math.round(size * 0.0325),
              marginTop: -Math.round(size * 0.0325),
              borderRadius: 3,
              backgroundColor: `rgba(205,175,255,${0.08 + d2 * 0.92})`,
              shadowColor: 'rgb(165,125,255)',
              shadowOpacity: d2 * 0.95,
              shadowRadius: d2 * 22,
              shadowOffset: { width: 0, height: 0 },
              elevation: Math.round(d2 * 12),
            }}
          />

          {/* Corner registration marks */}
          {[
            [0.07, 0.07],
            [0.82, 0.07],
            [0.07, 0.82],
            [0.82, 0.82],
          ].map(([fx, fy], i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: fx * size,
                top: fy * size,
                width: size * 0.045,
                height: size * 0.045,
                borderRadius: 1,
                backgroundColor: `rgba(255,255,255,${0.04 + dose * 0.07})`,
              }}
            />
          ))}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}
