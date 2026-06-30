import { getUserId } from './identity';
import { getAccessToken } from './supabaseAuth';

const DEFAULT_BASE_URL = 'http://localhost:8000';
const REQUEST_TIMEOUT_MS = 8_000;

export function baseUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL;
  return (url && url.length > 0 ? url : DEFAULT_BASE_URL).replace(/\/+$/, '');
}

export async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  const token = await getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    return headers;
  }
  const userId = await getUserId();
  return {
    ...headers,
    'X-User-Id': userId,
  };
}

function withTimeout(ms: number): { signal: AbortSignal; cancel: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, cancel: () => clearTimeout(timer) };
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function readErrorMessage(body: { detail?: unknown; message?: unknown }, status: number): string {
  if (typeof body.detail === 'string' && body.detail.trim()) return body.detail;
  if (Array.isArray(body.detail)) {
    const msgs = body.detail
      .map((item) =>
        item && typeof item === 'object' && 'msg' in item && typeof item.msg === 'string'
          ? item.msg
          : null,
      )
      .filter((msg): msg is string => Boolean(msg));
    if (msgs.length > 0) return msgs.join('; ');
  }
  if (typeof body.message === 'string' && body.message.trim()) return body.message;
  return `HTTP ${status}`;
}

export async function fetchJson<T>(
  path: string,
  init: RequestInit & { allow204?: boolean } = {},
): Promise<T> {
  const { allow204, headers, ...rest } = init;
  const { signal, cancel } = withTimeout(REQUEST_TIMEOUT_MS);
  try {
    const merged = { ...(await authHeaders()), ...(headers as Record<string, string> | undefined) };
    const res = await fetch(`${baseUrl()}${path}`, { ...rest, signal, headers: merged });
    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try {
        message = readErrorMessage((await res.json()) as { detail?: unknown; message?: unknown }, res.status);
      } catch {
      }
      throw new ApiError(message, res.status);
    }
    if (allow204 && res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } finally {
    cancel();
  }
}
