jest.mock('./apiClient', () => ({
  syncGoogleHealthFeatures: jest.fn(),
}));

import { syncGoogleHealthFeatures } from './apiClient';
import { syncGoogleHealthAndUploadFeatures } from './googleHealthSync';

const mockSync = syncGoogleHealthFeatures as jest.MockedFunction<
  typeof syncGoogleHealthFeatures
>;

describe('syncGoogleHealthAndUploadFeatures', () => {
  beforeEach(() => mockSync.mockReset());

  it('sends window, timezone, and wall-clock dataNow', async () => {
    mockSync.mockResolvedValue({ featureSetId: 'fs-gh-123', nightsAvailable: 4 });
    const before = Date.now();

    const res = await syncGoogleHealthAndUploadFeatures({
      bedtimeMinutes: 1380,
      wakeMinutes: 390,
    });

    expect(res.featureSetId).toBe('fs-gh-123');
    expect(mockSync).toHaveBeenCalledTimes(1);
    const arg = mockSync.mock.calls[0][0];
    expect(arg.bedtimeMinutes).toBe(1380);
    expect(arg.wakeMinutes).toBe(390);
    expect(typeof arg.timezone).toBe('string');
    expect(arg.dataNow).toBeDefined();
    const dataMs = new Date(arg.dataNow!).getTime();
    expect(dataMs).toBeGreaterThanOrEqual(before - 1000);
    expect(dataMs).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it('propagates errors (e.g. 409 not connected) to the caller', async () => {
    mockSync.mockRejectedValue(new Error('HTTP 409'));
    await expect(
      syncGoogleHealthAndUploadFeatures({ bedtimeMinutes: 1380, wakeMinutes: 390 }),
    ).rejects.toThrow('409');
  });
});
