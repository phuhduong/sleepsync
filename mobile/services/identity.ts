import { migrateAnonymousAccount } from './accountApi';
import { clearCachedPlan } from './planService';
import { invalidateSessionLog } from './sessionLog';
import { ensureSupabaseSession, getSupabaseUserId, isSupabaseConfigured } from './supabaseAuth';
import { storageGetItem, storageRemoveItem, storageSetItem } from './storage';

const USER_ID_KEY = '@sleepsync/userId';

function generateUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  throw new Error('crypto.randomUUID is not available');
}

let cached: string | null = null;
let inFlight: Promise<string> | null = null;

export async function linkAnonymousIdentityIfNeeded(): Promise<boolean> {
  const authId = await getSupabaseUserId();
  if (!authId) return false;

  const anonId = await storageGetItem(USER_ID_KEY);
  if (!anonId || anonId === authId) return false;

  try {
    await migrateAnonymousAccount(anonId);
    await clearCachedPlan();
    invalidateSessionLog();
    return true;
  } catch (err) {
    if (__DEV__) console.warn('[identity] migrate failed', err);
    return false;
  }
}

export async function getUserId(): Promise<string> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSession();
    const authId = await getSupabaseUserId();
    if (authId) return authId;
  }
  if (cached) return cached;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const stored = await storageGetItem(USER_ID_KEY);
    if (stored) {
      cached = stored;
      return stored;
    }
    const fresh = generateUuid();
    await storageSetItem(USER_ID_KEY, fresh);
    cached = fresh;
    return fresh;
  })();
  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

export async function _resetUserIdForTests(): Promise<void> {
  cached = null;
  inFlight = null;
  await storageRemoveItem(USER_ID_KEY);
}
