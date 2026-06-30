jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('./nightsApi', () => ({
  uploadDeliverySamples: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./identity', () => ({
  getUserId: jest.fn().mockResolvedValue('user-test'),
}));

import type { PatchBleClient, PatchBleConnectionState } from '../ble/patchBleClient.types';
import { PatchTransport } from './patchTransport';
import { createPatchSession } from './patchSession';

function createStubBleClient(): PatchBleClient & {
  getScheduleWriteCount: () => number;
  doseWrites: number[];
} {
  let state: PatchBleConnectionState = 'disconnected';
  const listeners = new Set<(s: PatchBleConnectionState) => void>();
  const doseWrites: number[] = [];
  let scheduleWriteCount = 0;

  const setState = (next: PatchBleConnectionState) => {
    state = next;
    listeners.forEach((fn) => fn(state));
  };

  return {
    isSupported: () => true,
    isConnected: () => state === 'connected',
    getState: () => state,
    getError: () => null,
    connect: async () => {
      setState('connected');
    },
    writeDose: async (dose: number) => {
      doseWrites.push(dose);
    },
    writeProfileSchedule: async () => {
      scheduleWriteCount += 1;
    },
    disconnect: async () => {
      setState('disconnected');
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getScheduleWriteCount: () => scheduleWriteCount,
    doseWrites,
  };
}

describe('createPatchSession', () => {
  it('arms schedule on connected client and skips per-tick BLE writes', async () => {
    const ble = createStubBleClient();
    await ble.connect();
    const transport = new PatchTransport({ bleEnabled: true, bleClient: ble });
    const session = createPatchSession({ transport, client: ble });
    const sleepWindow = {
      bedtime: new Date('2026-05-25T23:00:00Z'),
      wake: new Date('2026-05-26T07:00:00Z'),
      durationMs: 8 * 60 * 60 * 1000,
    };

    const armed = await session.arm(sleepWindow, new Date('2026-05-25T20:00:00Z'), [
      { t: 0, dose: 0 },
      { t: 1, dose: 0 },
    ]);
    expect(armed).toBe(true);
    expect(ble.getScheduleWriteCount()).toBe(1);

    session.tick({ t: 0.2, dose: 0.4, at: new Date() });
    await new Promise((r) => setTimeout(r, 10));
    expect(ble.doseWrites).toHaveLength(0);
    expect(transport.pendingSampleCount()).toBe(1);
  });

  it('end sends zero dose and flushes delivery log', async () => {
    const ble = createStubBleClient();
    await ble.connect();
    const transport = new PatchTransport({ bleEnabled: true, bleClient: ble });
    const session = createPatchSession({ transport, client: ble });

    session.tick({
      t: 0.1,
      dose: 0.5,
      at: new Date(),
    });
    session.tick({
      t: 0.2,
      dose: 0.6,
      at: new Date(Date.now() + 2000),
    });
    await session.end('night-1');

    expect(ble.doseWrites[ble.doseWrites.length - 1]).toBe(0);
    expect(transport.pendingSampleCount()).toBe(0);
  });
});
