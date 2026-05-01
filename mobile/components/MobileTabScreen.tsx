import { View, StyleSheet, useWindowDimensions } from 'react-native';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { BackgroundCanvas } from './BackgroundCanvas';
import { colors } from '../theme/tokens';

/** Matches tab column layouts — content + aurora stay inside this width on wide viewports (e.g. web). */
export const MOBILE_COLUMN_MAX = 390;

const SWIPE_GAIN = 0.52;
const SWIPE_MAX = 110;

function clampMag(v: number, mag: number) {
  return Math.max(-mag, Math.min(mag, v));
}

type MobileTabScreenProps = {
  children: ReactNode;
  /** `false`: column uses app background grey (`colors.bg`); wide gutters stay `#07080C`. */
  aurora?: boolean;
  /** Pan/swipe nudges the aurora (Tonight only). Requires children to use `pointerEvents="box-none"` where touches should pass through. */
  auroraInteractive?: boolean;
};

/**
 * Full-screen tab shell: `#07080C` outside the mobile column on wide layouts; in-column either aurora or `colors.bg`.
 */
export function MobileTabScreen({
  children,
  aurora = true,
  auroraInteractive = false,
}: MobileTabScreenProps) {
  const { width, height } = useWindowDimensions();
  const auroraWidth = Math.min(width, MOBILE_COLUMN_MAX);

  const [swipe, setSwipe] = useState({ x: 0, y: 0 });
  const decayRef = useRef<number | null>(null);

  const stopDecay = useCallback(() => {
    if (decayRef.current != null) {
      cancelAnimationFrame(decayRef.current);
      decayRef.current = null;
    }
  }, []);

  const decayLoop = useCallback(
    (startX: number, startY: number) => {
      stopDecay();
      let x = startX;
      let y = startY;
      const step = () => {
        x *= 0.86;
        y *= 0.86;
        if (Math.abs(x) < 0.55 && Math.abs(y) < 0.55) {
          setSwipe({ x: 0, y: 0 });
          decayRef.current = null;
          return;
        }
        setSwipe({ x, y });
        decayRef.current = requestAnimationFrame(step);
      };
      decayRef.current = requestAnimationFrame(step);
    },
    [stopDecay],
  );

  useEffect(() => () => stopDecay(), [stopDecay]);

  const applyPan = useCallback((tx: number, ty: number) => {
    setSwipe({
      x: clampMag(tx * SWIPE_GAIN, SWIPE_MAX),
      y: clampMag(ty * SWIPE_GAIN, SWIPE_MAX),
    });
  }, []);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(auroraInteractive)
        .manualActivation(false)
        .onBegin(() => {
          runOnJS(stopDecay)();
        })
        .onUpdate((e) => {
          runOnJS(applyPan)(e.translationX, e.translationY);
        })
        .onEnd((e) => {
          runOnJS(decayLoop)(
            clampMag(e.translationX * SWIPE_GAIN, SWIPE_MAX),
            clampMag(e.translationY * SWIPE_GAIN, SWIPE_MAX),
          );
        }),
    [auroraInteractive, applyPan, decayLoop, stopDecay],
  );

  const inner = (
    <View style={styles.root}>
      {aurora ? (
        <>
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFillObject, styles.gutterFill, { alignItems: 'center' }]}
          >
            <View style={{ width: auroraWidth, height, overflow: 'hidden' }}>
              <BackgroundCanvas
                width={auroraWidth}
                height={height}
                swipeOffsetX={swipe.x}
                swipeOffsetY={swipe.y}
              />
            </View>
          </View>
          {auroraInteractive ? (
            <View
              style={[StyleSheet.absoluteFillObject, styles.gestureStrip, { alignItems: 'center' }]}
              pointerEvents="box-none"
            >
              <GestureDetector gesture={panGesture}>
                <View style={{ width: auroraWidth, height, backgroundColor: 'transparent' }} />
              </GestureDetector>
            </View>
          ) : null}
        </>
      ) : (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, styles.gutterFill, { alignItems: 'center' }]}
        >
          <View style={{ width: auroraWidth, height, backgroundColor: colors.bg }} />
        </View>
      )}
      <View style={styles.childrenWrap} pointerEvents={auroraInteractive ? 'box-none' : 'auto'}>
        {children}
      </View>
    </View>
  );

  if (auroraInteractive) {
    return <GestureHandlerRootView style={styles.gestureRoot}>{inner}</GestureHandlerRootView>;
  }

  return inner;
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  root: {
    flex: 1,
    backgroundColor: '#07080C',
    position: 'relative',
  },
  gutterFill: {
    backgroundColor: '#07080C',
  },
  gestureStrip: {
    zIndex: 1,
  },
  childrenWrap: {
    flex: 1,
    zIndex: 2,
  },
});
