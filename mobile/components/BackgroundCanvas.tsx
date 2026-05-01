import AuroraSkiaCanvas from './AuroraSkiaCanvas';
import type { BackgroundCanvasProps } from './backgroundCanvasTypes';

export type { BackgroundCanvasProps };

/** iOS / Android — Skia loads with the native module (no CanvasKit). */
export function BackgroundCanvas(props: BackgroundCanvasProps) {
  return <AuroraSkiaCanvas {...props} />;
}
