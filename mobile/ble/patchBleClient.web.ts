import {
  BLE_DEVICE_NAME_PREFIX,
  BLE_PROFILE_SCHEDULE_UUID,
  BLE_SERVICE_UUID,
  BLE_TARGET_DOSE_UUID,
  clampDose,
  encodeDoseFloat32LE,
} from './bleConstants';
import { encodeProfileSchedule } from './bleSchedule';
import { bleDevLog } from './bleDevLog';
import type { PatchBleClient, PatchBleConnectionState } from './patchBleClient.types';

type WebBleCharacteristic = BluetoothRemoteGATTCharacteristic;
type WebBleDevice = BluetoothDevice;

const GATT_CONNECT_MS = 20_000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

async function getPreviouslyGrantedDevice(): Promise<BluetoothDevice | undefined> {
  if (!navigator.bluetooth.getDevices) return undefined;
  const granted = await navigator.bluetooth.getDevices();
  return granted.find((d) => (d.name ?? '').startsWith(BLE_DEVICE_NAME_PREFIX));
}

async function requestPatchDevice(): Promise<BluetoothDevice> {
  const previous = await getPreviouslyGrantedDevice();
  if (previous) return previous;

  const base = { optionalServices: [BLE_SERVICE_UUID] };

  return navigator.bluetooth.requestDevice({
    ...base,
    filters: [
      { namePrefix: BLE_DEVICE_NAME_PREFIX },
      { services: [BLE_SERVICE_UUID] },
    ],
  });
}

function formatConnectError(err: unknown): string {
  if (!(err instanceof DOMException)) {
    return err instanceof Error ? err.message : 'Connect failed';
  }
  switch (err.name) {
    case 'NotFoundError':
      return 'No SleepSync patch found. Connect an ESP32 flashed with firmware/patch_ble.ino.';
    case 'NotAllowedError':
      return 'Bluetooth permission denied — allow Chrome in System Settings → Privacy → Bluetooth';
    case 'SecurityError':
      return 'Web Bluetooth requires https:// or http://localhost';
    default:
      return err.message;
  }
}

export function createPatchBleClient(): PatchBleClient {
  let state: PatchBleConnectionState = 'unsupported';
  let error: string | null = null;
  let device: WebBleDevice | null = null;
  let doseCharacteristic: WebBleCharacteristic | null = null;
  let scheduleCharacteristic: WebBleCharacteristic | null = null;
  const listeners = new Set<(s: PatchBleConnectionState) => void>();

  const supported =
    typeof navigator !== 'undefined' && 'bluetooth' in navigator;

  if (supported) {
    state = 'disconnected';
  }

  const setState = (next: PatchBleConnectionState, err: string | null = null) => {
    state = next;
    error = err;
    listeners.forEach((fn) => fn(state));
  };

  return {
    isSupported: () => supported,
    isConnected: () => state === 'connected' && doseCharacteristic !== null,
    getState: () => state,
    getError: () => error,
    connect: async () => {
      if (state === 'connecting') return;
      if (!supported) {
        setState('unsupported', 'Web Bluetooth is not available in this browser');
        throw new Error('Web Bluetooth unsupported');
      }

      const available = await navigator.bluetooth.getAvailability?.();
      if (available === false) {
        setState('error', 'Bluetooth is turned off on this computer');
        throw new Error('Bluetooth unavailable');
      }

      setState('connecting');
      try {
        const picked = await requestPatchDevice();
        device = picked;
        device.addEventListener('gattserverdisconnected', () => {
          doseCharacteristic = null;
          scheduleCharacteristic = null;
          setState('disconnected');
        });

        const server = await withTimeout(
          device.gatt!.connect(),
          GATT_CONNECT_MS,
          'Could not open GATT connection to patch',
        );
        const service = await server.getPrimaryService(BLE_SERVICE_UUID);
        doseCharacteristic = await service.getCharacteristic(BLE_TARGET_DOSE_UUID);
        try {
          scheduleCharacteristic = await service.getCharacteristic(BLE_PROFILE_SCHEDULE_UUID);
        } catch {
          scheduleCharacteristic = null;
        }
        bleDevLog('connected', { mode: 'web', device: device.name ?? 'SleepSync' });
        setState('connected');
      } catch (err) {
        device = null;
        doseCharacteristic = null;
        scheduleCharacteristic = null;
        const message = formatConnectError(err);
        if (
          err instanceof DOMException &&
          (err.name === 'NotFoundError' || message.includes('cancelled'))
        ) {
          setState('disconnected', message.includes('cancelled') ? 'Pairing cancelled' : message);
          return;
        }
        setState('error', message);
        throw err;
      }
    },
    writeDose: async (dose: number) => {
      if (!doseCharacteristic) {
        throw new Error('BLE not connected');
      }
      const clamped = clampDose(dose);
      const value = encodeDoseFloat32LE(clamped);
      if (doseCharacteristic.properties.writeWithoutResponse) {
        await doseCharacteristic.writeValueWithoutResponse(value);
      } else {
        await doseCharacteristic.writeValue(value);
      }
      bleDevLog('writeDose', { mode: 'web', dose: clamped });
    },
    writeProfileSchedule: async (sleepWindow, now, keyframes) => {
      if (!scheduleCharacteristic) return;
      const value = encodeProfileSchedule(sleepWindow, now, keyframes);
      if (scheduleCharacteristic.properties.writeWithoutResponse) {
        await scheduleCharacteristic.writeValueWithoutResponse(value);
      } else {
        await scheduleCharacteristic.writeValue(value);
      }
      bleDevLog('writeProfileSchedule', { mode: 'web', keyframes: keyframes.length });
    },
    disconnect: async () => {
      try {
        if (device?.gatt?.connected) {
          device.gatt.disconnect();
        }
      } finally {
        device = null;
        doseCharacteristic = null;
        scheduleCharacteristic = null;
        setState('disconnected');
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
