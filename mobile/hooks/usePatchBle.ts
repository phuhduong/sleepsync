import { useCallback, useEffect, useState } from 'react';
import { getPatchBleClient } from '../ble/getPatchBleClient';
import type { PatchBleConnectionState } from '../ble/patchBleClient.types';
import { resolveBleEnabled } from '../ble/bleConfig';

export function usePatchBle() {
  const enabled = resolveBleEnabled();
  const client = enabled ? getPatchBleClient() : null;
  const [state, setState] = useState<PatchBleConnectionState>(
    () => client?.getState() ?? 'unsupported',
  );
  const [error, setError] = useState<string | null>(() => client?.getError() ?? null);

  useEffect(() => {
    if (!client) return;
    setState(client.getState());
    setError(client.getError());
    return client.subscribe((next) => {
      setState(next);
      setError(client.getError());
    });
  }, [client]);

  const connect = useCallback(async () => {
    if (!client) return;
    try {
      await client.connect();
    } catch {
    }
  }, [client]);

  const disconnect = useCallback(async () => {
    if (!client) return;
    await client.disconnect();
  }, [client]);

  return {
    enabled,
    supported: client?.isSupported() ?? false,
    connected: state === 'connected',
    state,
    error,
    connect,
    disconnect,
  };
}
