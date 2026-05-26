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

  it('sends window + timezone + referenceNow and returns the feature set', async () => {
    mockSync.mockResolvedValue({ featureSetId: 'fs-gh-123', nightsAvailable: 4 });
    const now = new Date('2026-05-25T22:00:00-04:00');

    const res = await syncGoogleHealthAndUploadFeatures({
      bedtimeMinutes: 1380,
      wakeMinutes: 390,
      now,
    });

    expect(res.featureSetId).toBe('fs-gh-123');
    expect(mockSync).toHaveBeenCalledTimes(1);
    const arg = mockSync.mock.calls[0][0];
    expect(arg.bedtimeMinutes).toBe(1380);
    expect(arg.wakeMinutes).toBe(390);
    expect(arg.referenceNow).toBe(now.toISOString());
    expect(typeof arg.timezone).toBe('string');
    expect(arg.timezone.length).toBeGreaterThan(0);
  });

  it('propagates errors (e.g. 409 not connected) to the caller', async () => {
    mockSync.mockRejectedValue(new Error('HTTP 409'));
    await expect(
      syncGoogleHealthAndUploadFeatures({ bedtimeMinutes: 1380, wakeMinutes: 390, now: new Date() }),
    ).rejects.toThrow('409');
  });
});
