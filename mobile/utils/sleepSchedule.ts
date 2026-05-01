/** Wall-clock minutes from midnight (0–1439) for habitual bedtime / wake. */

export const DEFAULT_BEDTIME_MINUTES = 22 * 60 + 30;
export const DEFAULT_WAKE_MINUTES = 6 * 60 + 30;

export function clampMinutes(m: number): number {
  const day = 24 * 60;
  return ((Math.round(m) % day) + day) % day;
}

/** en-US style 12h, e.g. 10:30 PM */
export function formatMinutesAsTime12h(totalMinutes: number): string {
  const normalized = clampMinutes(totalMinutes);
  let h = Math.floor(normalized / 60);
  const m = normalized % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

/** Local Date today with hours/minutes from clock minutes. */
export function dateFromClockMinutes(totalMinutes: number): Date {
  const normalized = clampMinutes(totalMinutes);
  const d = new Date();
  d.setHours(Math.floor(normalized / 60), normalized % 60, 0, 0);
  return d;
}

export function clockMinutesFromDate(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}
