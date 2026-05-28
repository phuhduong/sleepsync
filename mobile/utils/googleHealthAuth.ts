/**
 * Connect Google Health from the device.
 *
 * Live OAuth: Google redirects to the backend https callback; the backend
 * exchanges the code and redirects to this app's return URI (deep link or web).
 */
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { getGoogleHealthAuthorizeUrl, getGoogleHealthStatus } from './apiClient';
import type { GoogleHealthStatus } from './apiTypes';

WebBrowser.maybeCompleteAuthSession();

const CALLBACK_PATH = 'google-health/callback';

export type ConnectResult =
  | { ok: true; status: GoogleHealthStatus }
  | { ok: false; reason: 'cancelled' | 'error'; message?: string };

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function returnIndicatesSuccess(url: string): boolean {
  const parsed = Linking.parse(url);
  const connected = firstParam(parsed.queryParams?.connected as string | string[] | undefined);
  const error = firstParam(parsed.queryParams?.error as string | string[] | undefined);
  if (error) return false;
  return connected === '1' || connected === 'true';
}

export async function connectGoogleHealth(): Promise<ConnectResult> {
  try {
    const returnUri = Linking.createURL(CALLBACK_PATH);
    const authz = await getGoogleHealthAuthorizeUrl(returnUri);
    const result = await WebBrowser.openAuthSessionAsync(authz.authorizeUrl, returnUri);
    if (result.type !== 'success' || !result.url) {
      return { ok: false, reason: 'cancelled' };
    }
    if (!returnIndicatesSuccess(result.url)) {
      const parsed = Linking.parse(result.url);
      const err = firstParam(parsed.queryParams?.error as string | string[] | undefined);
      return { ok: false, reason: 'error', message: err ?? 'Google Health connection failed' };
    }
    const status = await getGoogleHealthStatus();
    return { ok: true, status };
  } catch (err) {
    return { ok: false, reason: 'error', message: (err as Error).message };
  }
}
