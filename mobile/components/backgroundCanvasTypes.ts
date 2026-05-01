/** Props for `BackgroundCanvas` / `AuroraSkiaCanvas` — shared so web lazy-load avoids circular imports. */
export type BackgroundCanvasProps = {
  width: number;
  height: number;
  grain?: boolean;
  swipeOffsetX?: number;
  swipeOffsetY?: number;
};
