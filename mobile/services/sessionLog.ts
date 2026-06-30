import { nightRecordToSession } from '../domain/sessionPresentation';
import type { SessionRecord } from '../domain/profiles';
import { listRecentNights } from './nightsApi';
import { storageGetItem, storageRemoveItem, storageSetItem } from './storage';

const STORAGE_KEY = '@sleepsync/sessions';

const listeners = new Set<() => void>();

export function subscribeSessionLog(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function invalidateSessionLog(): void {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[sessionLog] listener failed', e);
      }
    }
  });
}

function sortNewestFirst(sessions: SessionRecord[]): SessionRecord[] {
  return [...sessions].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
  );
}

async function loadCachedSessions(): Promise<SessionRecord[]> {
  const raw = await storageGetItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SessionRecord[];
    if (!Array.isArray(parsed)) return [];
    return sortNewestFirst(parsed);
  } catch (e) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[sessionLog] cache parse failed', e);
    }
    return [];
  }
}

async function cacheSessions(sessions: SessionRecord[]): Promise<void> {
  await storageSetItem(STORAGE_KEY, JSON.stringify(sessions));
}

export async function loadSessions(): Promise<SessionRecord[]> {
  try {
    const nights = await listRecentNights();
    const sessions = sortNewestFirst(nights.map(nightRecordToSession));
    await cacheSessions(sessions);
    return sessions;
  } catch (e) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[sessionLog] API load failed, using cache', e);
    }
    return loadCachedSessions();
  }
}

export async function clearSessions(): Promise<void> {
  await storageRemoveItem(STORAGE_KEY);
  invalidateSessionLog();
}
