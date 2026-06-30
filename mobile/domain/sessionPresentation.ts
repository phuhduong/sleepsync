import type { SessionRecord } from './profiles';
import { formatMinutesAsTime12h } from './sleepSchedule';
import type { NightRecord } from '../types/plan';

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
    outcome: debrief.outcome ?? 'ok',
    summary: debrief.summary ?? 'Session recorded.',
    completedAt,
    wearableVerified: night.wearableOutcome?.verified,
  };
}

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

export function sessionAccessibilityLabel(session: SessionRecord): string {
  const outcome = session.outcome === 'good' ? 'good' : 'ok';
  return `${session.date}. ${session.summary}. Outcome ${outcome}.`;
}

export function formatSessionDate(completedAt: Date): string {
  return completedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
