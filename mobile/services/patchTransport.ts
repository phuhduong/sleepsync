import { getPatchBleClient } from '../ble/getPatchBleClient';
import { bleDevLog } from '../ble/bleDevLog';
import type { PatchBleClient } from '../ble/patchBleClient.types';
import { resolveBleEnabled } from '../ble/bleConfig';
import { clampDose } from '../ble/bleConstants';
import type { DeliverySample } from './apiTypes';
import { uploadDeliverySamples } from './nightsApi';
import { getUserId } from './identity';
import { storageGetItem, storageRemoveItem, storageSetItem } from './storage';

const DEFAULT_DOSE_EPSILON = 0.01;
const DEFAULT_MIN_INTERVAL_MS = 1000;
const DEFAULT_BUFFER_LIMIT = 16_384;
const DEFAULT_FLUSH_INTERVAL_MS = 5 * 60 * 1000;
const DELIVERY_OUTBOX_KEY = '@sleepsync/delivery-outbox';

type OutboxEntry = { nightId: string; samples: DeliverySample[] };

export type PatchTransportConfig = {
  bleEnabled?: boolean;
  bleClient?: PatchBleClient;
  doseEpsilon?: number;
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
  private cfg: Required<Omit<PatchTransportConfig, 'bleClient'>> & { bleClient?: PatchBleClient };
  private samples: DeliverySample[] = [];
  private lastSentDose: number | null = null;
  private lastSentAt = 0;
  private inFlight: Promise<void> | null = null;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private flushNightId: string | null = null;

  constructor(config: PatchTransportConfig = {}) {
    this.cfg = {
      bleEnabled: config.bleEnabled ?? false,
      bleClient: config.bleClient,
      doseEpsilon: config.doseEpsilon ?? DEFAULT_DOSE_EPSILON,
      minIntervalMs: config.minIntervalMs ?? DEFAULT_MIN_INTERVAL_MS,
      bufferLimit: config.bufferLimit ?? DEFAULT_BUFFER_LIMIT,
    };
  }

  pushSnapshot(snapshot: SnapshotInput, options?: { skipBle?: boolean }): void {
    const at = snapshot.at ?? new Date();

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

    if (!options?.skipBle && this.shouldFlushBle()) {
      this.flushBle(snapshot.dose).catch(() => {});
    }
  }

  drainSamples(): DeliverySample[] {
    const out = this.samples;
    this.samples = [];
    return out;
  }

  restoreSamples(samples: DeliverySample[]): void {
    if (samples.length === 0) return;
    this.samples = [...samples, ...this.samples];
    if (this.samples.length > this.cfg.bufferLimit) {
      this.samples.splice(0, this.samples.length - this.cfg.bufferLimit);
    }
  }

  pendingSampleCount(): number {
    return this.samples.length;
  }

  async sendZeroDose(): Promise<void> {
    if (!this.shouldFlushBle()) return;
    await this.flushBle(0, true);
  }

  async flushDeliveryLog(nightId: string | null): Promise<boolean> {
    if (!nightId) return true;
    await this.flushOutbox();
    const samples = this.drainSamples();
    if (samples.length === 0) return true;
    try {
      const userId = await getUserId();
      await uploadDeliverySamples(nightId, userId, samples);
      return true;
    } catch (err) {
      this.restoreSamples(samples);
      await this.enqueueOutbox(nightId, samples);
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[patchTransport] delivery upload failed', err);
      }
      return false;
    }
  }

  startDeliveryFlush(nightId: string | null, intervalMs = DEFAULT_FLUSH_INTERVAL_MS): void {
    this.stopDeliveryFlush();
    if (!nightId) return;
    this.flushNightId = nightId;
    this.flushTimer = setInterval(() => {
      void this.flushDeliveryLog(this.flushNightId);
    }, intervalMs);
  }

  stopDeliveryFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flushNightId = null;
  }

  async flushOutbox(): Promise<void> {
    const entries = await this.loadOutbox();
    if (entries.length === 0) return;
    const userId = await getUserId();
    const remaining: OutboxEntry[] = [];
    for (const entry of entries) {
      try {
        await uploadDeliverySamples(entry.nightId, userId, entry.samples);
      } catch {
        remaining.push(entry);
      }
    }
    await this.saveOutbox(remaining);
  }

  private async loadOutbox(): Promise<OutboxEntry[]> {
    const raw = await storageGetItem(DELIVERY_OUTBOX_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as OutboxEntry[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private async saveOutbox(entries: OutboxEntry[]): Promise<void> {
    if (entries.length === 0) {
      await storageRemoveItem(DELIVERY_OUTBOX_KEY);
      return;
    }
    await storageSetItem(DELIVERY_OUTBOX_KEY, JSON.stringify(entries));
  }

  private async enqueueOutbox(nightId: string, samples: DeliverySample[]): Promise<void> {
    if (samples.length === 0) return;
    const entries = await this.loadOutbox();
    const existing = entries.find((e) => e.nightId === nightId);
    if (existing) {
      existing.samples.push(...samples);
    } else {
      entries.push({ nightId, samples: [...samples] });
    }
    await this.saveOutbox(entries);
  }

  private shouldFlushBle(): boolean {
    return Boolean(this.cfg.bleEnabled && this.cfg.bleClient?.isConnected());
  }

  private bufferSample(sample: DeliverySample): void {
    this.samples.push(sample);
    if (this.samples.length > this.cfg.bufferLimit) {
      this.samples.splice(0, this.samples.length - this.cfg.bufferLimit);
    }
  }

  private async flushBle(dose: number, force = false): Promise<void> {
    if (!this.cfg.bleClient?.isConnected()) return;
    if (!force && this.inFlight) return;

    const client = this.cfg.bleClient;
    const clamped = clampDose(dose);

    this.inFlight = (async () => {
      try {
        bleDevLog('flush', { dose: clamped, force });
        await client.writeDose(clamped);
      } catch (err) {
        bleDevLog('flushFailed', {
          dose: clamped,
          error: err instanceof Error ? err.message : String(err),
        });
        if (__DEV__) console.warn('[patchTransport] ble send failed', err);
      } finally {
        this.inFlight = null;
      }
    })();

    if (force) {
      await this.inFlight;
    }
  }
}

let transport: PatchTransport | null = null;

export function getPatchTransport(): PatchTransport {
  if (!transport) {
    const bleEnabled = resolveBleEnabled();
    transport = new PatchTransport({
      bleEnabled,
      bleClient: bleEnabled ? getPatchBleClient() : undefined,
    });
  }
  return transport;
}
