export type Keyframe = { t: number; dose: number; label?: string };

export type Phase = {
  id: string;
  name: string;
  duration: number;
  dose: number;
};

export type Profile = {
  id: string;
  name: string;
  recommended: boolean;
  rationale: string;
  keyframes: Keyframe[];
  phases: Phase[];
};

export type SessionWoke = 'yes' | 'no' | 'unsure';

export type SessionRecord = {
  id: number;
  date: string;
  profileId: string;
  profile: string;
  keyframes?: Keyframe[];
  rationale?: string;
  bedtimeMinutes?: number;
  wakeMinutes?: number;
  outcome: 'good' | 'ok';
  summary: string;
  woke: SessionWoke;
  groggy: number;
  note?: string;
  completedAt: string;
};

/** Offline fallback when the API has no plan yet. */
export const OFFLINE_FALLBACK_PROFILE_ID = 'standard';

export const OFFLINE_PROFILE: Profile = {
  id: OFFLINE_FALLBACK_PROFILE_ID,
  name: 'Standard',
  recommended: true,
  rationale: 'Balanced overnight curve when the backend is unavailable',
  keyframes: [
    { t: 0, dose: 0 },
    { t: 0.15, dose: 0, label: 'Delayed' },
    { t: 0.35, dose: 1.0, label: 'Ramp' },
    { t: 0.68, dose: 1.0, label: 'Sustained' },
    { t: 0.82, dose: 0.45, label: 'Taper' },
    { t: 0.93, dose: 0.08, label: 'Pre-wake' },
    { t: 1, dose: 0 },
  ],
  phases: [
    { id: 'delayed', name: 'Delayed Start', duration: 0.15, dose: 0 },
    { id: 'ramp', name: 'Ramp Up', duration: 0.2, dose: 0.85 },
    { id: 'sustained', name: 'Sustained', duration: 0.33, dose: 1.0 },
    { id: 'taper', name: 'Taper', duration: 0.14, dose: 0.45 },
    { id: 'prewake', name: 'Pre-wake', duration: 0.18, dose: 0.08 },
  ],
};

export function findProfile(_id: string): Profile {
  return OFFLINE_PROFILE;
}

/** Delivery curve for History — saved keyframes first, else offline preset. */
export function sessionKeyframes(session: SessionRecord): Keyframe[] {
  if (session.keyframes?.length) return session.keyframes;
  return OFFLINE_PROFILE.keyframes;
}
