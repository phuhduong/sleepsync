import { bleDevLog } from './bleDevLog';
import { createPatchBleClient as createPlatformPatchBleClient } from './patchBleClient';
import type { PatchBleClient } from './patchBleClient.types';

let client: PatchBleClient | null = null;

export function getPatchBleClient(): PatchBleClient {
  if (!client) {
    client = createPlatformPatchBleClient();
    if (__DEV__) {
      bleDevLog('client', { mode: 'radio' });
    }
  }
  return client;
}
