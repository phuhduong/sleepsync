export function lerpAtT(
  points: { t: number; value: number }[],
  t: number,
): number {
  if (!points.length) return 0;
  const sorted = [...points].sort((a, b) => a.t - b.t);
  if (t <= sorted[0].t) return sorted[0].value;
  if (t >= sorted[sorted.length - 1].t) return sorted[sorted.length - 1].value;
  for (let i = 1; i < sorted.length; i++) {
    if (t <= sorted[i].t) {
      const a = sorted[i - 1];
      const b = sorted[i];
      const span = b.t - a.t || 1;
      return a.value + (b.value - a.value) * ((t - a.t) / span);
    }
  }
  return sorted[sorted.length - 1].value;
}

export function smoothPathFromPoints(pts: [number, number][]): string {
  if (!pts.length) return '';
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cpx = (x0 + x1) / 2;
    d += ` C${cpx},${y0} ${cpx},${y1} ${x1},${y1}`;
  }
  return d;
}
