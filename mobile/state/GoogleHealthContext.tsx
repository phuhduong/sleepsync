import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { STALE_AFTER_MS } from '../constants';
import {
  clearCachedPlan,
} from '../services/planService';
import {
  disconnectGoogleHealth,
  getGoogleHealthStatus,
} from '../services/googleHealthApi';
import { connectGoogleHealth } from '../services/googleHealthAuth';
import type { GoogleHealthStatus } from '../types/plan';

const ENABLED = process.env.EXPO_PUBLIC_GOOGLE_HEALTH_ENABLED !== '0';

export type UseGoogleHealthResult = {
  enabled: boolean;
  status: GoogleHealthStatus | null;
  connected: boolean;
  loading: boolean;
  busy: boolean;
  error: string | null;
  refresh: (options?: { force?: boolean }) => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
};

const GoogleHealthCtx = createContext<UseGoogleHealthResult | null>(null);

export function GoogleHealthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<GoogleHealthStatus | null>(null);
  const [loading, setLoading] = useState(ENABLED);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const lastRefreshAtRef = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async (options: { force?: boolean } = {}) => {
    if (!ENABLED) return;
    const { force = false } = options;
    const ageMs = Date.now() - lastRefreshAtRef.current;
    if (!force && lastRefreshAtRef.current > 0 && ageMs < STALE_AFTER_MS) return;

    setLoading(true);
    try {
      const s = await getGoogleHealthStatus();
      if (mounted.current) {
        setStatus(s);
        setError(null);
        lastRefreshAtRef.current = Date.now();
      }
    } catch (err) {
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
        await refresh({ force: true });
      } else if (result.reason === 'error') {
        setError(result.message ?? 'Could not connect');
      }
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
      await clearCachedPlan();
      if (mounted.current) {
        setStatus((prev) =>
          prev
            ? { ...prev, connected: false, lastSyncAt: null }
            : { connected: false, scopes: [] },
        );
      }
      await refresh({ force: true });
    } catch (err) {
      if (mounted.current) setError((err as Error).message);
    } finally {
      if (mounted.current) setBusy(false);
    }
  }, [busy, refresh]);

  useEffect(() => {
    void refresh({ force: true });
  }, [refresh]);

  const value = useMemo<UseGoogleHealthResult>(
    () => ({
      enabled: ENABLED,
      status,
      connected: status?.connected ?? false,
      loading,
      busy,
      error,
      refresh,
      connect,
      disconnect,
    }),
    [status, loading, busy, error, refresh, connect, disconnect],
  );

  return <GoogleHealthCtx.Provider value={value}>{children}</GoogleHealthCtx.Provider>;
}

export function useGoogleHealth(): UseGoogleHealthResult {
  const ctx = useContext(GoogleHealthCtx);
  if (ctx == null) {
    throw new Error('useGoogleHealth must be used within GoogleHealthProvider');
  }
  return ctx;
}
