import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NightRecord } from './apiTypes';
import { listRecentNights } from './apiClient';
import type { SessionRecord, SessionWoke } from './profiles';

const STORAGE_KEY = '@sleepsync/sessions';

const listeners = new Set<() => void>();

/** Subscribe to server sync / cache clear so screens refresh without refocusing a tab. */
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

export function deriveOutcome(woke: SessionWoke, groggy: number): SessionRecord['outcome'] {
  if (woke === 'no' && groggy <= 2) return 'good';
  return 'ok';
}

export function buildSessionSummary(input: {
  woke: SessionWoke;
  groggy: number;
}): string {
  if (input.woke === 'yes') return 'Woke during the night.';
  if (input.groggy >= 4) return 'Morning grogginess reported.';
  if (input.woke === 'unsure') return 'Unclear whether sleep was uninterrupted.';
  if (input.groggy <= 2) return 'Slept through. Minimal grogginess.';
  return 'Slept through with mild morning grogginess.';
}

export function formatSessionDate(completedAt: Date): string {
  return completedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Map a server night (with debrief) to the History list/detail shape. */
export function nightRecordToSession(night: NightRecord): SessionRecord {
  const debrief = night.debrief!;
  const profile = night.generatedProfile;
  const completedAt =
    typeof debrief.completedAt === 'string'
      ? debrief.completedAt
      : new Date(debrief.completedAt).toISOString();
  return {
    id: night.nightId,
    date: formatSessionDate(new Date(completedAt)),
    profileId: debrief.profileId,
    profile: profile.name,
    keyframes: profile.keyframes,
    rationale: profile.rationale,
    bedtimeMinutes: night.bedtimeMinutes,
    wakeMinutes: night.wakeMinutes,
    woke: debrief.woke,
    groggy: debrief.groggy,
    note: debrief.note?.trim() || undefined,
    outcome: deriveOutcome(debrief.woke, debrief.groggy),
    summary: buildSessionSummary({ woke: debrief.woke, groggy: debrief.groggy }),
    completedAt,
  };
}

function sortNewestFirst(sessions: SessionRecord[]): SessionRecord[] {
  return [...sessions].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
  );
}

async function loadCachedSessions(): Promise<SessionRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SessionRecord[];
    if (!Array.isArray(parsed)) return [];
    return sortNewestFirst(parsed);
  } catch (e) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[sessionLog] cache load failed', e);
    }
    return [];
  }
}

async function cacheSessions(sessions: SessionRecord[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (e) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[sessionLog] cache write failed', e);
    }
  }
}

/** Load debrief-complete nights from the API; fall back to last cached list offline. */
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
  await AsyncStorage.removeItem(STORAGE_KEY);
  invalidateSessionLog();
}
