import { ApiError, fetchJson } from './http';

jest.mock('./identity', () => ({
  getUserId: jest.fn().mockResolvedValue('test-user'),
}));

jest.mock('./supabaseAuth', () => ({
  getAccessToken: jest.fn().mockResolvedValue(null),
}));

describe('fetchJson errors', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('surfaces FastAPI string detail from error responses', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ detail: 'night not found' }),
    }) as typeof fetch;

    await expect(fetchJson('/v1/nights/missing')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'night not found',
      status: 404,
    } satisfies Partial<ApiError>);
  });

  it('falls back to HTTP status when body is not JSON', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('not json');
      },
    }) as typeof fetch;

    await expect(fetchJson('/v1/tonight/plan')).rejects.toMatchObject({
      message: 'HTTP 500',
      status: 500,
    });
  });
});
