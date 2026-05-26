jest.mock('./apiClient', () => ({
  uploadDeliverySamples: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./identity', () => ({
  getUserId: jest.fn().mockResolvedValue('user-test'),
}));

import { uploadDeliverySamples } from './apiClient';
import { flushDeliveryLog } from './flushDeliveryLog';
import { PatchTransport } from './patchTransport';

describe('flushDeliveryLog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('drains samples and uploads when nightId is set', async () => {
    const transport = new PatchTransport();
    transport.pushSnapshot({ t: 0.1, dose: 0.5, at: new Date() });
    transport.pushSnapshot({ t: 0.2, dose: 0.6, at: new Date(Date.now() + 2000) });

    await flushDeliveryLog(transport, 'night-abc');

    expect(uploadDeliverySamples).toHaveBeenCalledTimes(1);
    const [, userId, samples] = (uploadDeliverySamples as jest.Mock).mock.calls[0];
    expect(userId).toBe('user-test');
    expect(samples.length).toBeGreaterThan(0);
    expect(transport.pendingSampleCount()).toBe(0);
  });

  it('no-ops without nightId', async () => {
    const transport = new PatchTransport();
    transport.pushSnapshot({ t: 0, dose: 0.1, at: new Date() });
    await flushDeliveryLog(transport, null);
    expect(uploadDeliverySamples).not.toHaveBeenCalled();
  });
});
