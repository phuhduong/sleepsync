import { formatMinutesAsTime12h } from './sleepSchedule';
import type { SessionRecord } from './profiles';

/** Primary line in History list — debrief outcome, not plan name. */
export function sessionListTitle(session: SessionRecord): string {
  return session.summary;
}

/**
 * Detail hero — schedule when saved, otherwise a short observational label
 * (not Good/Ok night or the full debrief sentence).
 */
export function sessionDetailHeading(session: SessionRecord): string {
  if (session.bedtimeMinutes != null && session.wakeMinutes != null) {
    return `${formatMinutesAsTime12h(session.bedtimeMinutes)} – ${formatMinutesAsTime12h(session.wakeMinutes)}`;
  }
  if (session.woke === 'yes') return 'Interrupted sleep';
  if (session.woke === 'unsure') return 'Uncertain rest';
  if (session.groggy >= 4) return 'Heavy morning grogginess';
  if (session.groggy >= 3) return 'Mild morning grogginess';
  if (session.woke === 'no' && session.groggy <= 2) return 'Uninterrupted sleep';
  return 'Mixed night';
}

/** Saved plan rationale only — omit generic filler under the hero. */
export function sessionDetailRationale(session: SessionRecord): string | undefined {
  const r = session.rationale?.trim();
  return r || undefined;
}

export function sessionAccessibilityLabel(session: SessionRecord): string {
  const outcome = session.outcome === 'good' ? 'good' : 'ok';
  return `${session.date}. ${session.summary}. Outcome ${outcome}.`;
}
