/**
 * Connection state + connect/disconnect actions for the Connect Google Health
 * UI. Wraps apiClient status + googleHealthAuth. The biometric pull itself
 * lives in useTonightPlan (sync when connected, mock otherwise).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { disconnectGoogleHealth, getGoogleHealthStatus } from './apiClient';
import { connectGoogleHealth } from './googleHealthAuth';
import type { GoogleHealthStatus } from './apiTypes';

// Optional gate: set EXPO_PUBLIC_GOOGLE_HEALTH_ENABLED=0 to hide the UI.
// Defaults to enabled so the sandbox demo works out of the box.
const ENABLED = process.env.EXPO_PUBLIC_GOOGLE_HEALTH_ENABLED !== '0';

export type UseGoogleHealthResult = {
  enabled: boolean;
  status: GoogleHealthStatus | null;
  connected: boolean;
  loading: boolean;
  busy: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
};

export function useGoogleHealth(): UseGoogleHealthResult {
  const [status, setStatus] = useState<GoogleHealthStatus | null>(null);
  const [loading, setLoading] = useState(ENABLED);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!ENABLED) return;
    setLoading(true);
    try {
      const s = await getGoogleHealthStatus();
      if (mounted.current) {
        setStatus(s);
        setError(null);
      }
    } catch (err) {
      // Backend offline → treat as not connected; surface nothing loud.
      if (mounted.current) setError((err as Error).message);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  const connect = useCallback(async () => {
    if (!ENABLED || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await connectGoogleHealth();
      if (!mounted.current) return;
      if (result.ok) {
        setStatus(result.status);
        await refresh();
      } else if (result.reason === 'error') {
        setError(result.message ?? 'Could not connect');
      }
      // 'cancelled' is silent.
    } finally {
      if (mounted.current) setBusy(false);
    }
  }, [busy, refresh]);

  const disconnect = useCallback(async () => {
    if (!ENABLED || busy) return;
    setBusy(true);
    setError(null);
    try {
      await disconnectGoogleHealth();
      if (mounted.current) {
        setStatus((prev) =>
          prev ? { ...prev, connected: false, lastSyncAt: null } : prev,
        );
      }
    } catch (err) {
      if (mounted.current) setError((err as Error).message);
    } finally {
      if (mounted.current) setBusy(false);
    }
  }, [busy]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    enabled: ENABLED,
    status,
    connected: status?.connected ?? false,
    loading,
    busy,
    error,
    refresh,
    connect,
    disconnect,
  };
}
