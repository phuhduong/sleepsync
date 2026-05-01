import { StyleSheet, View } from 'react-native';
import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import type { BackgroundCanvasProps } from './backgroundCanvasTypes';

export type { BackgroundCanvasProps };

function SolidFallback({ width, height }: BackgroundCanvasProps) {
  const W = Math.max(2, width);
  const H = Math.max(2, height);
  return <View style={[styles.fallback, { width: W, height: H }]} pointerEvents="none" />;
}

/** Web — CanvasKit loads once via `WithSkiaWeb`, then the Aurora canvas chunk (matches native shader). */
export function BackgroundCanvas(props: BackgroundCanvasProps) {
  return (
    <WithSkiaWeb
      componentProps={props}
      fallback={<SolidFallback {...props} />}
      getComponent={() => import('./AuroraSkiaCanvas')}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: '#07080C',
  },
});
