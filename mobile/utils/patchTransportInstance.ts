import { PatchTransport, resolvePatchUrl } from './patchTransport';

let transport: PatchTransport | null = null;

/** Shared overnight transport — Live ticks doses; debrief may flush leftovers. */
export function getPatchTransport(): PatchTransport {
  if (!transport) {
    transport = new PatchTransport({ espUrl: resolvePatchUrl() });
  }
  return transport;
}
