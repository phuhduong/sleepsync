/** Props for `BackgroundCanvas` / `AuroraSkiaCanvas` — shared so web lazy-load avoids circular imports. */
export type SkyUniforms = {
  zenith: [number, number, number];
  horizon: [number, number, number];
  cloud: [number, number, number];
};

export type BackgroundCanvasProps = {
  width: number;
  height: number;
  grain?: boolean;
  swipeOffsetX?: number;
  swipeOffsetY?: number;
  sky?: SkyUniforms;
};
