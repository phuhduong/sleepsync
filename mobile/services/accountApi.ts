import { fetchJson } from './http';

export type MigrateAccountResponse = {
  nightsMoved: number;
  featureSetsMoved: number;
  connectionMoved: boolean;
};

export function migrateAnonymousAccount(fromUserId: string): Promise<MigrateAccountResponse> {
  return fetchJson<MigrateAccountResponse>('/v1/account/migrate', {
    method: 'POST',
    body: JSON.stringify({ fromUserId }),
  });
}
