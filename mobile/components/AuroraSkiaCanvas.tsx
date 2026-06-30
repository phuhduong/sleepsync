import { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Canvas, Fill, Shader, vec } from '@shopify/react-native-skia';
import type { BackgroundCanvasProps, SkyUniforms } from './backgroundCanvasTypes';
import { CIRCADIAN_ANCHORS } from '../theme/circadianPalettes';
import { unitRgbCss } from '../theme/colorUtils';
import { compileAuroraShader } from './auroraShader';

function skyShaderUniforms(sky: SkyUniforms) {
  const [zr, zg, zb] = sky.zenith;
  const [hr, hg, hb] = sky.horizon;
  const [cr, cg, cb] = sky.cloud;
  return {
    uZenithR: zr,
    uZenithG: zg,
    uZenithB: zb,
    uHorizonR: hr,
    uHorizonG: hg,
    uHorizonB: hb,
    uCloudR: cr,
    uCloudG: cg,
    uCloudB: cb,
  };
}

const TWO_PI = Math.PI * 2;
const BASE_ORBIT_MS = 17500;
const RAD_PER_MS = TWO_PI / BASE_ORBIT_MS;

const MIN_DIM = 32;

const DEFAULT_SKY: SkyUniforms = CIRCADIAN_ANCHORS.night.sky;

export default function AuroraSkiaCanvas({
  width,
  height,
  grain = true,
  swipeOffsetX = 0,
  swipeOffsetY = 0,
  sky = DEFAULT_SKY,
}: BackgroundCanvasProps) {
  const win = useWindowDimensions();
  const screen = Dimensions.get('window');

  const wUse = width >= MIN_DIM ? width : Math.max(win.width, screen.width);
  const hUse = height >= MIN_DIM ? height : Math.max(win.height, screen.height);
  const W = Math.max(8, wUse);
  const H = Math.max(8, hUse);

  const [runtimeEffect, setRuntimeEffect] = useState(() => compileAuroraShader());

  useEffect(() => {
    if (!runtimeEffect) {
      setRuntimeEffect(compileAuroraShader());
    }
  }, [runtimeEffect]);

  const [phase, setPhase] = useState(0);

  useEffect(() => {
    let raf = 0;
    let last =
      typeof globalThis.performance !== 'undefined'
        ? globalThis.performance.now()
        : Date.now();
    const tick = (now: number) => {
      const dt = Math.min(Math.max(0, now - last), 80);
      last = now;
      setPhase((p) => {
        let next = p + dt * RAD_PER_MS;
        if (next > 512 * TWO_PI) next -= 512 * TWO_PI;
        return next;
      });
      raf = globalThis.requestAnimationFrame(tick);
    };
    raf = globalThis.requestAnimationFrame(tick);
    return () => globalThis.cancelAnimationFrame(raf);
  }, []);

  const skyUniforms = skyShaderUniforms(sky);
  const underlay = unitRgbCss(sky.horizon);

  if (!runtimeEffect) {
    return (
      <View
        style={[styles.fallback, { width: W, height: H, backgroundColor: underlay }]}
        pointerEvents="none"
      />
    );
  }

  return (
    <View style={{ width: W, height: H, backgroundColor: underlay }} pointerEvents="none">
      <Canvas style={{ width: W, height: H }} pointerEvents="none" colorSpace="srgb">
        <Fill>
          <Shader
            source={runtimeEffect}
            uniforms={{
              uResolution: vec(W, H),
              uTime: phase,
              uSwipe: vec(swipeOffsetX, swipeOffsetY),
              uGrain: grain ? 1.0 : 0.0,
              ...skyUniforms,
            }}
          />
        </Fill>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {},
});
