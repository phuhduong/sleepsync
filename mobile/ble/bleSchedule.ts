import type { Keyframe } from '../domain/profiles';
import type { SleepWindow } from '../domain/sleepWindow';

export const MAX_SCHEDULE_KEYFRAMES = 24;

const HEADER_BYTES = 10;

export function encodeProfileSchedule(
  sleepWindow: SleepWindow,
  now: Date,
  keyframes: Keyframe[],
): ArrayBuffer {
  const count = Math.min(Math.max(keyframes.length, 1), MAX_SCHEDULE_KEYFRAMES);
  const msUntilBed = Math.max(0, sleepWindow.bedtime.getTime() - now.getTime());
  const windowDurationMs = Math.max(1, sleepWindow.durationMs);

  const buffer = new ArrayBuffer(HEADER_BYTES + count * 8);
  const view = new DataView(buffer);
  view.setUint32(0, msUntilBed, true);
  view.setUint32(4, windowDurationMs, true);
  view.setUint16(8, count, true);

  for (let i = 0; i < count; i++) {
    const kf = keyframes[i] ?? keyframes[keyframes.length - 1]!;
    const off = HEADER_BYTES + i * 8;
    view.setFloat32(off, Math.min(1, Math.max(0, kf.t)), true);
    view.setFloat32(off + 4, Math.min(1, Math.max(0, kf.dose)), true);
  }

  return buffer;
}

export function encodeProfileScheduleBase64(
  sleepWindow: SleepWindow,
  now: Date,
  keyframes: Keyframe[],
): string {
  const bytes = new Uint8Array(encodeProfileSchedule(sleepWindow, now, keyframes));
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}
