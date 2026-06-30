import { fetchJson } from './http';
import type { DebriefPayload, DebriefResponse, DeliverySample, NightRecord } from './apiTypes';

export function listRecentNights(limit = 50): Promise<NightRecord[]> {
  return fetchJson<NightRecord[]>(`/v1/nights/recent?limit=${limit}`, { method: 'GET' });
}

export function syncDebrief(nightId: string, debrief: DebriefPayload): Promise<DebriefResponse> {
  return fetchJson<DebriefResponse>(`/v1/nights/${encodeURIComponent(nightId)}/debrief`, {
    method: 'POST',
    body: JSON.stringify(debrief),
  });
}

export async function uploadDeliverySamples(
  nightId: string,
  userId: string,
  samples: DeliverySample[],
): Promise<void> {
  if (samples.length === 0) return;
  await fetchJson<void>(`/v1/nights/${encodeURIComponent(nightId)}/delivery`, {
    method: 'POST',
    body: JSON.stringify({ userId, samples }),
    allow204: true,
  });
}
