import type { Keyframe } from '../domain/profiles';
import type { SleepWindow } from '../domain/sleepWindow';
import type { PatchBleClient } from '../ble/patchBleClient.types';
import type { PatchTransport, SnapshotInput } from './patchTransport';

export function createPatchSession(deps: {
  transport: PatchTransport;
  client: PatchBleClient | null;
}) {
  let scheduleArmed = false;

  return {
    async arm(sleepWindow: SleepWindow, now: Date, keyframes: Keyframe[]) {
      if (!deps.client?.isConnected()) return false;
      try {
        await deps.client.writeProfileSchedule(sleepWindow, now, keyframes);
        scheduleArmed = true;
        return true;
      } catch (err) {
        if (__DEV__) console.warn('[patchSession] profile schedule upload failed', err);
        return false;
      }
    },
    tick(snapshot: SnapshotInput) {
      deps.transport.pushSnapshot(snapshot, { skipBle: scheduleArmed });
    },
    async end(nightId: string | null) {
      scheduleArmed = false;
      await deps.transport.sendZeroDose().catch(() => {});
      await deps.transport.flushDeliveryLog(nightId);
    },
  };
}
