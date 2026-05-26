/**
 * Pure profile execution engine — consumes a latched sleep window + Profile
 * + appNow and returns the dose/phase snapshot to render. This is the
 * "schedule" half of the app; the actuator side lives in patchTransport.
 *
 * Time semantics match the rest of the app: t = 0 at scheduled bedtime,
 * t = 1 at scheduled wake. Demo fast-forward comes from
 * `CircadianThemeProvider.useAppNow()` — no Live-only multiplier.
 */
import type { Phase, Profile } from './profiles';
import type { SleepWindow } from './sleepWindow';
import { isSessionComplete, profileTimelineT } from './sleepWindow';

export type EngineSnapshot = {
  /** Profile-timeline parameter in [0, 1]. */
  t: number;
  /** Interpolated dose at `t` ∈ [0, 1]. */
  dose: number;
  /** Index of the current phase in `profile.phases`. */
  phaseIdx: number;
  phase: Phase;
  nextPhase: Phase | null;
  /** Progress through the current phase in [0, 1]. */
  phaseProgress: number;
  /** True before scheduled bedtime — Live shows "until bed" copy. */
  beforeBed: boolean;
  /** True once `appNow >= window.wake`. */
  sessionEnded: boolean;
};

/** Find the active phase + linear-interpolated dose at parameter `t`. */
export function evaluateProfile(profile: Profile, t: number): {
  dose: number;
  phaseIdx: number;
  phaseProgress: number;
} {
  const clampedT = clamp01(t);

  let cumulative = 0;
  let phaseIdx = profile.phases.length - 1;
  let phaseProgress = 1;
  for (let i = 0; i < profile.phases.length; i++) {
    const ph = profile.phases[i];
    if (clampedT < cumulative + ph.duration || i === profile.phases.length - 1) {
      phaseIdx = i;
      phaseProgress = ph.duration <= 0 ? 1 : clamp01((clampedT - cumulative) / ph.duration);
      break;
    }
    cumulative += ph.duration;
  }

  return { dose: interpolateDose(profile, clampedT), phaseIdx, phaseProgress };
}

/** Linear interpolation across the keyframe list — same math the UI uses. */
export function interpolateDose(profile: Profile, t: number): number {
  const clampedT = clamp01(t);
  const kfs = profile.keyframes;
  if (kfs.length === 0) return 0;
  if (clampedT <= kfs[0].t) return kfs[0].dose;
  for (let j = 1; j < kfs.length; j++) {
    if (clampedT <= kfs[j].t) {
      const a = kfs[j - 1];
      const b = kfs[j];
      const span = b.t - a.t;
      if (span <= 0) return b.dose;
      const f = (clampedT - a.t) / span;
      return a.dose + f * (b.dose - a.dose);
    }
  }
  return kfs[kfs.length - 1].dose;
}

export function computeEngineSnapshot(args: {
  profile: Profile;
  sleepWindow: SleepWindow;
  now: Date;
}): EngineSnapshot {
  const { profile, sleepWindow, now } = args;
  const t = profileTimelineT(now, sleepWindow);
  const { dose, phaseIdx, phaseProgress } = evaluateProfile(profile, t);
  const phase = profile.phases[phaseIdx];
  const nextPhase = profile.phases[phaseIdx + 1] ?? null;
  return {
    t,
    dose,
    phaseIdx,
    phase,
    nextPhase,
    phaseProgress,
    beforeBed: now.getTime() < sleepWindow.bedtime.getTime(),
    sessionEnded: isSessionComplete(now, sleepWindow),
  };
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}
