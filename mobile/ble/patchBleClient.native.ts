import { NativeModules } from 'react-native';
import { BleManager, type Characteristic, type Device } from 'react-native-ble-plx';
import {
  BLE_DEVICE_NAME_PREFIX,
  BLE_PROFILE_SCHEDULE_UUID,
  BLE_SERVICE_UUID,
  BLE_TARGET_DOSE_UUID,
  clampDose,
  encodeDoseBase64,
} from './bleConstants';
import { encodeProfileScheduleBase64 } from './bleSchedule';
import { bleDevLog } from './bleDevLog';
import type { PatchBleClient, PatchBleConnectionState } from './patchBleClient.types';

const SCAN_MS = 10_000;

const NATIVE_BLE_UNAVAILABLE_MSG =
  'Bluetooth requires a dev build on a physical iPhone — not the Simulator or Expo Go';

function isBleNativeModuleAvailable(): boolean {
  return NativeModules.BlePlx != null;
}

function normalizeUuid(uuid: string): string {
  return uuid.replace(/-/g, '').toLowerCase();
}

function matchesPatch(device: Device): boolean {
  const name = device.localName ?? device.name ?? '';
  if (name.startsWith(BLE_DEVICE_NAME_PREFIX)) return true;
  const target = normalizeUuid(BLE_SERVICE_UUID);
  return (device.serviceUUIDs ?? []).some((u) => normalizeUuid(u) === target);
}

async function waitForPoweredOn(manager: BleManager): Promise<void> {
  const current = await manager.state();
  if (current === 'PoweredOn') return;
  if (current === 'Unsupported') {
    throw new Error(
      'Bluetooth is not available in the simulator — use a physical iPhone or Chrome web with an ESP32 patch',
    );
  }
  if (current === 'Unauthorized') {
    throw new Error('Bluetooth permission denied — allow Bluetooth for SleepSync in Settings');
  }
  if (current === 'PoweredOff') {
    throw new Error('Turn on Bluetooth to connect your patch');
  }

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      sub.remove();
      reject(new Error('Bluetooth is not ready — try again'));
    }, SCAN_MS);

    const sub = manager.onStateChange((state) => {
      if (state === 'PoweredOn') {
        clearTimeout(timeout);
        sub.remove();
        resolve();
      } else if (state === 'PoweredOff' || state === 'Unauthorized') {
        clearTimeout(timeout);
        sub.remove();
        reject(
          new Error(
            state === 'Unauthorized'
              ? 'Bluetooth permission denied'
              : 'Turn on Bluetooth to connect your patch',
          ),
        );
      }
    }, true);
  });
}

async function writeCharacteristic(
  device: Device,
  characteristic: Characteristic,
  charUuid: string,
  payload: string,
): Promise<void> {
  if (characteristic.isWritableWithoutResponse) {
    await device.writeCharacteristicWithoutResponseForService(
      BLE_SERVICE_UUID,
      charUuid,
      payload,
    );
  } else {
    await device.writeCharacteristicWithResponseForService(
      BLE_SERVICE_UUID,
      charUuid,
      payload,
    );
  }
}

export function createPatchBleClient(): PatchBleClient {
  let manager: BleManager | null = null;
  let state: PatchBleConnectionState = 'disconnected';
  let error: string | null = null;
  let device: Device | null = null;
  let doseCharacteristic: Characteristic | null = null;
  let scheduleCharacteristic: Characteristic | null = null;
  let disconnectSub: { remove: () => void } | null = null;
  const listeners = new Set<(s: PatchBleConnectionState) => void>();

  const getManager = (): BleManager => {
    if (!isBleNativeModuleAvailable()) {
      throw new Error(NATIVE_BLE_UNAVAILABLE_MSG);
    }
    if (!manager) {
      manager = new BleManager();
    }
    return manager;
  };

  const setState = (next: PatchBleConnectionState, err: string | null = null) => {
    state = next;
    error = err;
    listeners.forEach((fn) => fn(state));
  };

  const cleanupDevice = () => {
    device = null;
    doseCharacteristic = null;
    scheduleCharacteristic = null;
  };

  return {
    isSupported: () => isBleNativeModuleAvailable(),
    isConnected: () => state === 'connected' && doseCharacteristic !== null,
    getState: () => state,
    getError: () => error,
    connect: async () => {
      if (state === 'connecting') return;
      if (!isBleNativeModuleAvailable()) {
        setState('error', NATIVE_BLE_UNAVAILABLE_MSG);
        throw new Error(NATIVE_BLE_UNAVAILABLE_MSG);
      }
      setState('connecting');
      try {
        const ble = getManager();
        await waitForPoweredOn(ble);

        const found = await new Promise<Device | null>((resolve, reject) => {
          let resolved = false;
          const timeout = setTimeout(() => {
            if (!resolved) {
              resolved = true;
              ble.stopDeviceScan().catch(() => {});
              resolve(null);
            }
          }, SCAN_MS);

          ble.startDeviceScan(
            null,
            { allowDuplicates: false },
            (scanError, scanned) => {
              if (resolved) return;
              if (scanError) {
                resolved = true;
                clearTimeout(timeout);
                ble.stopDeviceScan().catch(() => {});
                reject(scanError);
                return;
              }
              if (!scanned || !matchesPatch(scanned)) return;
              resolved = true;
              clearTimeout(timeout);
              ble.stopDeviceScan().catch(() => {});
              resolve(scanned);
            },
          );
        });

        if (!found) {
          throw new Error('No SleepSync patch found — power on your ESP32 patch');
        }

        device = await found.connect();
        await device.discoverAllServicesAndCharacteristics();
        const chars = await device.characteristicsForService(BLE_SERVICE_UUID);
        doseCharacteristic =
          chars.find(
            (c) => normalizeUuid(c.uuid) === normalizeUuid(BLE_TARGET_DOSE_UUID),
          ) ?? null;
        scheduleCharacteristic =
          chars.find(
            (c) => normalizeUuid(c.uuid) === normalizeUuid(BLE_PROFILE_SCHEDULE_UUID),
          ) ?? null;

        if (!doseCharacteristic) {
          throw new Error('TargetDose characteristic not found on patch');
        }

        disconnectSub = device.onDisconnected(() => {
          cleanupDevice();
          setState('disconnected');
        });

        setState('connected');
        bleDevLog('connected', { mode: 'native', device: device.name ?? 'SleepSync' });
      } catch (err) {
        cleanupDevice();
        const message = err instanceof Error ? err.message : 'Connect failed';
        setState('error', message);
        throw err;
      }
    },
    writeDose: async (dose: number) => {
      if (!device || !doseCharacteristic) {
        throw new Error('BLE not connected');
      }
      const clamped = clampDose(dose);
      await writeCharacteristic(
        device,
        doseCharacteristic,
        BLE_TARGET_DOSE_UUID,
        encodeDoseBase64(clamped),
      );
      bleDevLog('writeDose', { mode: 'native', dose: clamped });
    },
    writeProfileSchedule: async (sleepWindow, now, keyframes) => {
      if (!device || !scheduleCharacteristic) return;
      await writeCharacteristic(
        device,
        scheduleCharacteristic,
        BLE_PROFILE_SCHEDULE_UUID,
        encodeProfileScheduleBase64(sleepWindow, now, keyframes),
      );
      bleDevLog('writeProfileSchedule', { mode: 'native', keyframes: keyframes.length });
    },
    disconnect: async () => {
      try {
        disconnectSub?.remove();
        disconnectSub = null;
        if (device) {
          await device.cancelConnection();
        }
      } catch {
      } finally {
        cleanupDevice();
        setState('disconnected');
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
