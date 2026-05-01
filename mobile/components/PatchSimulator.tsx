import { Pressable, View, Animated, Easing, ViewStyle, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Rect, Circle } from 'react-native-svg';
import { useEffect, useId, useRef } from 'react';
import { colors } from '../theme/tokens';

/** Flat gel when delivery is off — all membrane stops blend here (no fake glow during delayed start). */
const MEMBRANE_IDLE: [number, number, number] = [22, 18, 38];

const MEMBRANE_VIVID_STOPS: readonly [number, number, number][] = [
  [148, 118, 228],
  [118, 88, 204],
  [98, 72, 188],
  [68, 48, 158],
  [20, 16, 38],
];

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function mixRgb(idle: [number, number, number], vivid: [number, number, number], strength: number): string {
  const t = clamp01(strength);
  const r = Math.round(idle[0] + (vivid[0] - idle[0]) * t);
  const g = Math.round(idle[1] + (vivid[1] - idle[1]) * t);
  const b = Math.round(idle[2] + (vivid[2] - idle[2]) * t);
  return `rgb(${r},${g},${b})`;
}

type Props = {
  dose: number;
  isActive?: boolean;
  onPress?: () => void;
  size?: number;
};

export function PatchSimulator({ dose = 0, isActive = true, onPress, size = 200 }: Props) {
  const gradId = useId().replace(/:/g, '');
  const d2 = dose * dose;
  /** Tracks delivery: invisible at delayed start / end of night, strongest mid-session */
  const membraneGlow = clamp01(dose) ** 0.92;
  const br = Math.round(size * 0.17);
  const haloSize = Math.round(size * 1.5);
  const haloPad = Math.round((haloSize - size) / 2);

  /** Inset from outer patch edge (px). Inner corner radius = outer − inset keeps curves concentric. */
  const padAdhesive = Math.round(size * 0.08);
  const padMembrane = Math.round(size * 0.2);
  const rAdhesive = Math.max(0, br - padAdhesive);
  const innerSide = size - 2 * padMembrane;
  const rGeom = br - padMembrane;
  const rHarmonic = innerSide * 0.13;
  const rMembrane = Math.round(
    Math.min(Math.max(rGeom, rHarmonic), innerSide / 2 - StyleSheet.hairlineWidth),
  );

  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!isActive || dose <= 0.05) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.62, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isActive, dose, pulse]);

  const glow = (spread: number, opacity: number, radius: number): ViewStyle => ({
    position: 'absolute',
    width: size + spread * 2,
    height: size + spread * 2,
    left: haloPad - spread,
    top:  haloPad - spread,
    borderRadius: br + spread,
    shadowColor: colors.accent,
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

  const membraneStroke = `rgba(210,195,255,${(0.04 + d2 * 0.22) * membraneGlow})`;
  const adhesiveStroke = `rgba(148,120,235,${0.06 + d2 * 0.32})`;

  return (
    <View style={{ width: haloSize, height: haloSize, alignItems: 'center', justifyContent: 'center' }}>
      {/* Halo + shadow glow — pulses together. Circular by design so the composition reads as a ring. */}
      <Animated.View style={{ position: 'absolute', width: haloSize, height: haloSize, opacity: pulse }}>
        <Svg
          width={haloSize}
          height={haloSize}
          viewBox={`0 0 ${haloSize} ${haloSize}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ position: 'absolute', left: 0, top: 0 }}
        >
          <Defs>
            <RadialGradient id={`halo-${gradId}`} cx="50%" cy="50%" rx="50%" ry="50%" fx="50%" fy="50%">
              <Stop offset="0%" stopColor={colors.accent} stopOpacity={0.14 + d2 * 0.34} />
              <Stop offset="28%" stopColor={colors.accent} stopOpacity={0.09 + d2 * 0.22} />
              <Stop offset="52%" stopColor={colors.accent} stopOpacity={0.05 + d2 * 0.12} />
              <Stop offset="78%" stopColor={colors.accent} stopOpacity={0.015 + d2 * 0.04} />
              <Stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle
            cx={haloSize / 2}
            cy={haloSize / 2}
            r={haloSize / 2 - 0.5}
            fill={`url(#halo-${gradId})`}
          />
        </Svg>
        <View style={glow(0, d2 * 0.88, Math.max(8,  d2 * 44))} />
        <View style={glow(0, d2 * 0.48, Math.max(12, d2 * 72))} />
        <View style={glow(0, d2 * 0.20, Math.max(16, d2 * 100))} />
      </Animated.View>

      {/* Patch surface — steady, no opacity animation. */}
      <Pressable
        onPress={onPress}
        style={{
          width: size,
          height: size,
          borderRadius: br,
          overflow: 'hidden',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: `rgba(255,255,255,${0.055 + dose * 0.08})`,
        }}
      >
        <View style={{ width: '100%', height: '100%', borderRadius: br, overflow: 'hidden' }}>
        <LinearGradient
          colors={patchBgColors}
          locations={[0, 0.52, 1]}
          start={{ x: 0.16, y: 0.05 }}
          end={{ x: 0.84, y: 0.95 }}
          style={{ flex: 1 }}
        >
          {/* Shell vignette — depth without competing with the membrane */}
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(0,0,0,0)', 'rgba(5,4,14,0.22)', 'rgba(2,2,10,0.38)']}
            locations={[0, 0.72, 1]}
            start={{ x: 0.5, y: 0.2 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Adhesive border ring — inner radius = outer − inset so curves stay parallel to the shell */}
          <View
            style={{
              position: 'absolute',
              top: padAdhesive,
              left: padAdhesive,
              right: padAdhesive,
              bottom: padAdhesive,
              borderRadius: rAdhesive,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: adhesiveStroke,
            }}
          />

          {/* Delivery membrane — glowing inset window */}
          <View
            style={{
              position: 'absolute',
              top: padMembrane,
              left: padMembrane,
              right: padMembrane,
              bottom: padMembrane,
              borderRadius: rMembrane,
              overflow: 'hidden',
            }}
          >
            <Svg
              width={innerSide}
              height={innerSide}
              viewBox={`0 0 ${innerSide} ${innerSide}`}
              preserveAspectRatio="xMidYMid meet"
              style={StyleSheet.absoluteFill}
            >
              <Defs>
                {/* Fully opaque stops — varying stopOpacity let the halo SVG behind bleed through and read as a ring */}
                <RadialGradient id={`membrane-${gradId}`} cx="50%" cy="50%" rx="88%" ry="88%" fx="50%" fy="50%">
                  <Stop offset="0%" stopColor={mixRgb(MEMBRANE_IDLE, MEMBRANE_VIVID_STOPS[0], membraneGlow)} />
                  <Stop offset="26%" stopColor={mixRgb(MEMBRANE_IDLE, MEMBRANE_VIVID_STOPS[1], membraneGlow)} />
                  <Stop offset="52%" stopColor={mixRgb(MEMBRANE_IDLE, MEMBRANE_VIVID_STOPS[2], membraneGlow)} />
                  <Stop offset="76%" stopColor={mixRgb(MEMBRANE_IDLE, MEMBRANE_VIVID_STOPS[3], membraneGlow)} />
                  <Stop offset="100%" stopColor={mixRgb(MEMBRANE_IDLE, MEMBRANE_VIVID_STOPS[4], membraneGlow)} />
                </RadialGradient>
              </Defs>
              <Rect
                x={0}
                y={0}
                width={innerSide}
                height={innerSide}
                rx={rMembrane}
                ry={rMembrane}
                fill={`url(#membrane-${gradId})`}
                stroke={membraneStroke}
                strokeWidth={StyleSheet.hairlineWidth}
              />
            </Svg>
            {/* Hairline sheen only — full-area overlays were shading the center and reinforcing a ring */}
            <LinearGradient
              pointerEvents="none"
              colors={[`rgba(245,240,255,${0.028 * membraneGlow})`, 'rgba(255,255,255,0)']}
              locations={[0, 0.35]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.52, y: 0.28 }}
              style={StyleSheet.absoluteFill}
            />
          </View>

        </LinearGradient>
        </View>
      </Pressable>
    </View>
  );
}
