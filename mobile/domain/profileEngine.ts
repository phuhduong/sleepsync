import { lerpAtT } from './curveMath';
import type { Profile } from './profiles';
import type { SleepWindow } from './sleepWindow';
import { isSessionComplete, profileTimelineT } from './sleepWindow';

export type EngineSnapshot = {
  t: number;
  dose: number;
  phaseIdx: number;
  phaseProgress: number;
  beforeBed: boolean;
  sessionEnded: boolean;
};

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

export function interpolateDose(profile: Profile, t: number): number {
  return lerpAtT(
    profile.keyframes.map((kf) => ({ t: kf.t, value: kf.dose })),
    clamp01(t),
  );
}

export function computeEngineSnapshot(args: {
  profile: Profile;
  sleepWindow: SleepWindow;
  now: Date;
}): EngineSnapshot {
  const { profile, sleepWindow, now } = args;
  const t = profileTimelineT(now, sleepWindow);
  const { dose, phaseIdx, phaseProgress } = evaluateProfile(profile, t);
  return {
    t,
    dose,
    phaseIdx,
    phaseProgress,
    beforeBed: now.getTime() < sleepWindow.bedtime.getTime(),
    sessionEnded: isSessionComplete(now, sleepWindow),
  };
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}
