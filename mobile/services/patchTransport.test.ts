jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('./nightsApi', () => ({
  uploadDeliverySamples: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./identity', () => ({
  getUserId: jest.fn().mockResolvedValue('user-test'),
}));

import { uploadDeliverySamples } from './nightsApi';
import type { PatchBleClient, PatchBleConnectionState } from '../ble/patchBleClient.types';
import { PatchTransport } from './patchTransport';

function createStubBleClient(): PatchBleClient & { _writes: number[] } {
  let state: PatchBleConnectionState = 'disconnected';
  const writes: number[] = [];
  const listeners = new Set<(s: PatchBleConnectionState) => void>();

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
      writes.push(dose);
    },
    writeProfileSchedule: async () => {},
    disconnect: async () => {
      setState('disconnected');
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    _writes: writes,
  };
}

describe('PatchTransport', () => {
  it('writes dose to BLE when connected and buffers samples', async () => {
    const ble = createStubBleClient();
    await ble.connect();
    const transport = new PatchTransport({ bleEnabled: true, bleClient: ble });

    transport.pushSnapshot({ t: 0, dose: 0.1, at: new Date() });
    await new Promise((r) => setTimeout(r, 10));

    expect(ble._writes[0]).toBeCloseTo(0.1);
    expect(transport.pendingSampleCount()).toBe(1);
  });

  describe('flushDeliveryLog', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('uploads buffered samples and clears the buffer', async () => {
      const transport = new PatchTransport();
      transport.pushSnapshot({ t: 0.1, dose: 0.5, at: new Date() });
      transport.pushSnapshot({ t: 0.2, dose: 0.6, at: new Date(Date.now() + 2000) });

      const ok = await transport.flushDeliveryLog('night-abc');

      expect(ok).toBe(true);
      expect(uploadDeliverySamples).toHaveBeenCalledTimes(1);
      expect(transport.pendingSampleCount()).toBe(0);
    });

    it('restores samples when upload fails', async () => {
      (uploadDeliverySamples as jest.Mock).mockRejectedValueOnce(new Error('network'));
      const transport = new PatchTransport();
      transport.pushSnapshot({ t: 0.1, dose: 0.5, at: new Date() });
      transport.pushSnapshot({ t: 0.2, dose: 0.6, at: new Date(Date.now() + 2000) });

      const ok = await transport.flushDeliveryLog('night-abc');

      expect(ok).toBe(false);
      expect(transport.pendingSampleCount()).toBe(2);
    });
  });
});
