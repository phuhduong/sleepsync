import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Keyframe, SessionRecord, SessionWoke } from './profiles';

const STORAGE_KEY = '@sleepsync/sessions';

const listeners = new Set<() => void>();

/** Subscribe to append/clear so screens can refresh without refocusing a tab. */
export function subscribeSessionLog(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function notifySessionLogChanged(): void {
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

export type NewSessionInput = {
  profileId: string;
  profile: string;
  keyframes: Keyframe[];
  rationale?: string;
  bedtimeMinutes?: number;
  wakeMinutes?: number;
  woke: SessionWoke;
  groggy: number;
  note?: string;
};

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

function sortNewestFirst(sessions: SessionRecord[]): SessionRecord[] {
  return [...sessions].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
  );
}

export async function loadSessions(): Promise<SessionRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SessionRecord[];
    if (!Array.isArray(parsed)) return [];
    return sortNewestFirst(parsed);
  } catch (e) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[sessionLog] load failed', e);
    }
    return [];
  }
}

export async function clearSessions(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
  notifySessionLogChanged();
}

export async function appendSession(input: NewSessionInput): Promise<SessionRecord> {
  const existing = await loadSessions();
  const completedAt = new Date();
  const record: SessionRecord = {
    id: completedAt.getTime(),
    date: formatSessionDate(completedAt),
    profileId: input.profileId,
    profile: input.profile,
    keyframes: input.keyframes,
    rationale: input.rationale,
    bedtimeMinutes: input.bedtimeMinutes,
    wakeMinutes: input.wakeMinutes,
    woke: input.woke,
    groggy: input.groggy,
    note: input.note?.trim() || undefined,
    outcome: deriveOutcome(input.woke, input.groggy),
    summary: buildSessionSummary(input),
    completedAt: completedAt.toISOString(),
  };
  const next = sortNewestFirst([record, ...existing]);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  notifySessionLogChanged();
  return record;
}
