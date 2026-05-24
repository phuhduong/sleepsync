/** Minutes from local midnight for a `Date`. */
export function minutesSinceMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

/** Build a `Date` on the same calendar day as `referenceDay` at `minutesSinceMidnight`. */
export function dateFromMinutesSinceMidnight(
  minutesSinceMidnight: number,
  referenceDay: Date = new Date(),
): Date {
  const m = Math.floor(((minutesSinceMidnight % 1440) + 1440) % 1440);
  const d = new Date(referenceDay);
  d.setHours(Math.floor(m / 60), m % 60, 0, 0);
  return d;
}

export function formatDateAsClock(d: Date): string {
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
