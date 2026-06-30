import { StyleSheet, View } from 'react-native';
import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import type { BackgroundCanvasProps, SkyUniforms } from './backgroundCanvasTypes';
import { CIRCADIAN_ANCHORS } from '../theme/circadianPalettes';
import { unitRgbCss } from '../theme/colorUtils';

export type { BackgroundCanvasProps };

function SolidFallback({ width, height, sky }: BackgroundCanvasProps) {
  const W = Math.max(2, width);
  const H = Math.max(2, height);
  const s: SkyUniforms = sky ?? {
    zenith: CIRCADIAN_ANCHORS.night.sky.zenith,
    horizon: CIRCADIAN_ANCHORS.night.sky.horizon,
    cloud: CIRCADIAN_ANCHORS.night.sky.cloud,
  };
  return (
    <View
      style={[styles.fallback, { width: W, height: H, backgroundColor: unitRgbCss(s.horizon) }]}
      pointerEvents="none"
    />
  );
}

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
  fallback: {},
});
