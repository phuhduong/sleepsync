import AuroraSkiaCanvas from './AuroraSkiaCanvas';
import type { BackgroundCanvasProps } from './backgroundCanvasTypes';

export type { BackgroundCanvasProps };

export function BackgroundCanvas(props: BackgroundCanvasProps) {
  return <AuroraSkiaCanvas {...props} />;
}
