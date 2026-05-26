/**
 * Patch transport — the "actuator" half of the engine.
 *
 * The simulator always receives every dose update (so the visualizer stays
 * smooth). Optional external pumps (ESP8266 or future BLE) only see a
 * de-duplicated stream so we don't slam them with millisecond updates.
 *
 * A small ring-buffer of `DeliverySample`s is kept so the Tonight flow can
 * batch-upload delivery telemetry to the backend (POST /v1/nights/.../delivery;
 * `/v1/nights/{nightId}/delivery`). The buffer caps in memory; nothing is
 * persisted across reloads — backend is the source of truth.
 */
import { Platform } from 'react-native';
import type { DeliverySample } from './apiTypes';
import { sendDoseToESP8266 } from './esp8266';

const DEFAULT_DOSE_EPSILON = 0.01;
const DEFAULT_MIN_INTERVAL_MS = 1000;
const DEFAULT_BUFFER_LIMIT = 2048;

export type PatchTransportConfig = {
  /** External pump base URL — `EXPO_PUBLIC_PATCH_URL` semantically. */
  espUrl?: string;
  /** Minimum |Δdose| before talking to the pump again. */
  doseEpsilon?: number;
  /** Minimum ms between pump writes. */
  minIntervalMs?: number;
  bufferLimit?: number;
};

export type SnapshotInput = {
  t: number;
  dose: number;
  phaseId?: string;
  at?: Date;
};

export class PatchTransport {
  private cfg: Required<Omit<PatchTransportConfig, 'espUrl'>> & { espUrl?: string };
  private samples: DeliverySample[] = [];
  private lastSentDose: number | null = null;
  private lastSentAt = 0;
  private inFlight: Promise<void> | null = null;
  private listeners = new Set<(dose: number, t: number) => void>();

  constructor(config: PatchTransportConfig = {}) {
    this.cfg = {
      espUrl: config.espUrl,
      doseEpsilon: config.doseEpsilon ?? DEFAULT_DOSE_EPSILON,
      minIntervalMs: config.minIntervalMs ?? DEFAULT_MIN_INTERVAL_MS,
      bufferLimit: config.bufferLimit ?? DEFAULT_BUFFER_LIMIT,
    };
  }

  /** Called by Live on every engine tick — cheap, simulator-only. */
  pushSnapshot(snapshot: SnapshotInput): void {
    const at = snapshot.at ?? new Date();
    this.listeners.forEach((fn) => {
      try {
        fn(snapshot.dose, snapshot.t);
      } catch (e) {
        if (__DEV__) console.warn('[patchTransport] listener threw', e);
      }
    });

    const changed =
      this.lastSentDose === null ||
      Math.abs(snapshot.dose - this.lastSentDose) >= this.cfg.doseEpsilon;
    const cadenceOk = at.getTime() - this.lastSentAt >= this.cfg.minIntervalMs;
    if (!changed && !cadenceOk) return;

    this.bufferSample({
      at: at.toISOString(),
      t: snapshot.t,
      dose: snapshot.dose,
      phaseId: snapshot.phaseId,
    });
    this.lastSentDose = snapshot.dose;
    this.lastSentAt = at.getTime();

    if (this.cfg.espUrl) {
      // Fire-and-forget; the simulator is the ground truth for the UI.
      this.flushEsp(snapshot.dose).catch(() => {});
    }
  }

  subscribe(fn: (dose: number, t: number) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Drain the delivery sample buffer (called before batch upload). */
  drainSamples(): DeliverySample[] {
    const out = this.samples;
    this.samples = [];
    return out;
  }

  /** Peek without draining — useful for debug overlays. */
  pendingSampleCount(): number {
    return this.samples.length;
  }

  private bufferSample(sample: DeliverySample): void {
    this.samples.push(sample);
    if (this.samples.length > this.cfg.bufferLimit) {
      this.samples.splice(0, this.samples.length - this.cfg.bufferLimit);
    }
  }

  private async flushEsp(dose: number): Promise<void> {
    if (this.inFlight) return;
    this.inFlight = (async () => {
      try {
        // The ESP helper is hard-coded to its AP IP; native fetch is fine
        // on iOS/Android. Web is blocked by CORS in many scenarios — skip.
        if (Platform.OS === 'web') return;
        await sendDoseToESP8266(dose);
      } catch (err) {
        if (__DEV__) console.warn('[patchTransport] esp send failed', err);
      } finally {
        this.inFlight = null;
      }
    })();
  }
}

/** Read EXPO_PUBLIC_PATCH_URL safely on every platform. */
export function resolvePatchUrl(): string | undefined {
  const url = process.env.EXPO_PUBLIC_PATCH_URL;
  return url && url.length > 0 ? url : undefined;
}
