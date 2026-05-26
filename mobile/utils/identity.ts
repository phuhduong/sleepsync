import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_ID_KEY = '@sleepsync/userId';

/** Lightweight RFC 4122 v4 UUID — no extra dependency. Demo identity, not crypto. */
function generateUuid(): string {
  const hex = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      out += '-';
      continue;
    }
    if (i === 14) {
      out += '4';
      continue;
    }
    if (i === 19) {
      out += hex[(Math.floor(Math.random() * 4) + 8) | 0];
      continue;
    }
    out += hex[Math.floor(Math.random() * 16)];
  }
  return out;
}

let cached: string | null = null;
let inFlight: Promise<string> | null = null;

export async function getUserId(): Promise<string> {
  if (cached) return cached;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const stored = await AsyncStorage.getItem(USER_ID_KEY);
      if (stored) {
        cached = stored;
        return stored;
      }
    } catch {
      // fall through to generate
    }
    const fresh = generateUuid();
    try {
      await AsyncStorage.setItem(USER_ID_KEY, fresh);
    } catch {
      // best-effort: still return the in-memory id
    }
    cached = fresh;
    return fresh;
  })();
  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

/** Test helper: clear in-memory + persisted id. */
export async function _resetUserIdForTests(): Promise<void> {
  cached = null;
  inFlight = null;
  try {
    await AsyncStorage.removeItem(USER_ID_KEY);
  } catch {
    // ignore
  }
}
