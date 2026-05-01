import { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Canvas, Fill, Shader, vec } from '@shopify/react-native-skia';
import type { BackgroundCanvasProps } from './backgroundCanvasTypes';
import { compileAuroraShader } from './auroraShader';

const TWO_PI = Math.PI * 2;
const BASE_ORBIT_MS = 17500;
const RAD_PER_MS = TWO_PI / BASE_ORBIT_MS;

/** Props can be 0 before first layout — fall back so Skia canvas is never a tiny square. */
const MIN_DIM = 32;

export default function AuroraSkiaCanvas({
  width,
  height,
  grain = true,
  swipeOffsetX = 0,
  swipeOffsetY = 0,
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

  if (!runtimeEffect) {
    return <View style={[styles.fallback, { width: W, height: H }]} />;
  }

  return (
    <Canvas
      style={{ width: W, height: H }}
      pointerEvents="none"
      opaque
      colorSpace="srgb"
    >
      <Fill>
        <Shader
          source={runtimeEffect}
          uniforms={{
            uResolution: vec(W, H),
            uTime: phase,
            uSwipe: vec(swipeOffsetX, swipeOffsetY),
            uGrain: grain ? 1.0 : 0.0,
          }}
        />
      </Fill>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: '#090A10',
  },
});
