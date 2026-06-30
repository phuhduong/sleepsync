import { encodeProfileSchedule } from './bleSchedule';
import { resolveActiveSleepWindow } from '../domain/sleepWindow';

describe('encodeProfileSchedule', () => {
  it('matches the firmware binary layout', () => {
    const now = new Date('2026-05-25T20:00:00Z');
    const window = resolveActiveSleepWindow(now, 23 * 60, 7 * 60);
    const buffer = encodeProfileSchedule(window, now, [{ t: 0.25, dose: 0.75 }]);
    const view = new DataView(buffer);

    expect(view.getUint32(0, true)).toBeGreaterThan(0);
    expect(view.getUint32(4, true)).toBe(window.durationMs);
    expect(view.getUint16(8, true)).toBe(1);
    expect(view.getFloat32(10, true)).toBeCloseTo(0.25);
    expect(view.getFloat32(14, true)).toBeCloseTo(0.75);
  });
});
