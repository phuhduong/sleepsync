import { uploadDeliverySamples } from './apiClient';
import { getUserId } from './identity';
import type { PatchTransport } from './patchTransport';

/** Upload buffered delivery samples for a backend night (best-effort). */
export async function flushDeliveryLog(
  transport: PatchTransport,
  nightId: string | null,
): Promise<void> {
  if (!nightId) return;
  const samples = transport.drainSamples();
  if (samples.length === 0) return;
  try {
    const userId = await getUserId();
    await uploadDeliverySamples(nightId, userId, samples);
  } catch (err) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[flushDeliveryLog] upload failed', err);
    }
  }
}
