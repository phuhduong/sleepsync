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
  /** Display label, e.g. "May 24". */
  date: string;
  profileId: string;
  profile: string;
  outcome: 'good' | 'ok';
  summary: string;
  woke: SessionWoke;
  groggy: number;
  note?: string;
  completedAt: string;
};

export const profiles: Profile[] = [
  {
    id: 'standard',
    name: 'Standard',
    recommended: true,
    rationale: 'Balanced overnight curve — default when recent nights look typical',
    keyframes: [
      { t: 0,    dose: 0 },
      { t: 0.15, dose: 0,    label: 'Delayed' },
      { t: 0.35, dose: 1.0,  label: 'Ramp' },
      { t: 0.68, dose: 1.0,  label: 'Sustained' },
      { t: 0.82, dose: 0.45, label: 'Taper' },
      { t: 0.93, dose: 0.08, label: 'Pre-wake' },
      { t: 1,    dose: 0 },
    ],
    phases: [
      { id: 'delayed',   name: 'Delayed Start', duration: 0.15, dose: 0 },
      { id: 'ramp',      name: 'Ramp Up',       duration: 0.20, dose: 0.85 },
      { id: 'sustained', name: 'Sustained',     duration: 0.33, dose: 1.0 },
      { id: 'taper',     name: 'Taper',         duration: 0.14, dose: 0.45 },
      { id: 'prewake',   name: 'Pre-wake',      duration: 0.18, dose: 0.08 },
    ],
  },
  {
    id: 'early_waker',
    name: 'Early Waker',
    recommended: false,
    rationale: 'Extended second-half coverage for early morning waking',
    keyframes: [
      { t: 0,    dose: 0 },
      { t: 0.10, dose: 0,    label: 'Delayed' },
      { t: 0.25, dose: 0.65, label: 'Ramp' },
      { t: 0.55, dose: 0.8,  label: 'Sustained' },
      { t: 0.75, dose: 1.0 },
      { t: 0.88, dose: 0.5,  label: 'Taper' },
      { t: 0.95, dose: 0.12, label: 'Pre-wake' },
      { t: 1,    dose: 0 },
    ],
    phases: [
      { id: 'delayed',   name: 'Delayed Start', duration: 0.10, dose: 0 },
      { id: 'ramp',      name: 'Ramp Up',       duration: 0.15, dose: 0.65 },
      { id: 'sustained', name: 'Sustained',     duration: 0.50, dose: 0.9 },
      { id: 'taper',     name: 'Taper',         duration: 0.13, dose: 0.5 },
      { id: 'prewake',   name: 'Pre-wake',      duration: 0.12, dose: 0.12 },
    ],
  },
  {
    id: 'maintenance',
    name: 'Maintenance',
    recommended: false,
    rationale: 'Low steady dose for mild, infrequent disruption',
    keyframes: [
      { t: 0,    dose: 0 },
      { t: 0.12, dose: 0,    label: 'Delayed' },
      { t: 0.30, dose: 0.55, label: 'Ramp' },
      { t: 0.75, dose: 0.6,  label: 'Sustained' },
      { t: 0.88, dose: 0.3,  label: 'Taper' },
      { t: 0.95, dose: 0.08, label: 'Pre-wake' },
      { t: 1,    dose: 0 },
    ],
    phases: [
      { id: 'delayed',   name: 'Delayed Start', duration: 0.12, dose: 0 },
      { id: 'ramp',      name: 'Ramp Up',       duration: 0.18, dose: 0.55 },
      { id: 'sustained', name: 'Sustained',     duration: 0.45, dose: 0.6 },
      { id: 'taper',     name: 'Taper',         duration: 0.13, dose: 0.3 },
      { id: 'prewake',   name: 'Pre-wake',      duration: 0.12, dose: 0.08 },
    ],
  },
  {
    id: 'deep_sleep',
    name: 'Deep Sleep',
    recommended: false,
    rationale: 'Peak dose in first half for strong early-night suppression',
    keyframes: [
      { t: 0,    dose: 0 },
      { t: 0.08, dose: 0,    label: 'Delayed' },
      { t: 0.25, dose: 1.0,  label: 'Ramp' },
      { t: 0.45, dose: 1.0,  label: 'Sustained' },
      { t: 0.68, dose: 0.55 },
      { t: 0.82, dose: 0.3,  label: 'Taper' },
      { t: 0.93, dose: 0.07, label: 'Pre-wake' },
      { t: 1,    dose: 0 },
    ],
    phases: [
      { id: 'delayed',   name: 'Delayed Start', duration: 0.08, dose: 0 },
      { id: 'ramp',      name: 'Ramp Up',       duration: 0.17, dose: 1.0 },
      { id: 'sustained', name: 'Sustained',     duration: 0.37, dose: 0.85 },
      { id: 'taper',     name: 'Taper',         duration: 0.20, dose: 0.35 },
      { id: 'prewake',   name: 'Pre-wake',      duration: 0.18, dose: 0.07 },
    ],
  },
  {
    id: 'gentle_ramp',
    name: 'Gentle Ramp',
    recommended: false,
    rationale: 'Slow build for those sensitive to dose intensity',
    keyframes: [
      { t: 0,    dose: 0 },
      { t: 0.20, dose: 0,    label: 'Delayed' },
      { t: 0.48, dose: 0.72, label: 'Ramp' },
      { t: 0.65, dose: 0.88, label: 'Sustained' },
      { t: 0.80, dose: 0.5,  label: 'Taper' },
      { t: 0.93, dose: 0.12, label: 'Pre-wake' },
      { t: 1,    dose: 0 },
    ],
    phases: [
      { id: 'delayed',   name: 'Delayed Start', duration: 0.20, dose: 0 },
      { id: 'ramp',      name: 'Ramp Up',       duration: 0.28, dose: 0.72 },
      { id: 'sustained', name: 'Sustained',     duration: 0.17, dose: 0.88 },
      { id: 'taper',     name: 'Taper',         duration: 0.15, dose: 0.5 },
      { id: 'prewake',   name: 'Pre-wake',      duration: 0.20, dose: 0.12 },
    ],
  },
];

export const findProfile = (id: string): Profile =>
  profiles.find(p => p.id === id) ?? profiles[0];
