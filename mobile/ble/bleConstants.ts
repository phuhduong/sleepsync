/** See docs/BLE_PATCH.md. */

export const BLE_DEVICE_NAME_PREFIX = 'SleepSync';

export const BLE_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';

export const BLE_TARGET_DOSE_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';

export const BLE_PROFILE_SCHEDULE_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

export function clampDose(dose: number): number {
  return Math.min(1, Math.max(0, dose));
}

export function encodeDoseFloat32LE(dose: number): ArrayBuffer {
  const buffer = new ArrayBuffer(4);
  new DataView(buffer).setFloat32(0, clampDose(dose), true);
  return buffer;
}

export function encodeDoseBase64(dose: number): string {
  const bytes = new Uint8Array(encodeDoseFloat32LE(dose));
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}
