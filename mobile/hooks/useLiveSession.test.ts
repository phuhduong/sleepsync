import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { OFFLINE_PROFILE } from '../domain/profiles';
import { useLiveSession } from './useLiveSession';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('expo-keep-awake', () => ({
  useKeepAwake: jest.fn(),
}));

const mockSetPendingSession = jest.fn();
const mockBedtimeMinutes = 23 * 60;
const mockWakeMinutes = 7 * 60;

jest.mock('../state/AppState', () => ({
  useAppState: () => ({
    bedtimeMinutes: mockBedtimeMinutes,
    wakeMinutes: mockWakeMinutes,
    setPendingSession: mockSetPendingSession,
  }),
}));

const mockAppNow = new Date('2026-05-25T23:30:00.000Z');

jest.mock('../theme/CircadianThemeProvider', () => ({
  useAppNow: () => mockAppNow,
}));

jest.mock('../state/TonightPlanContext', () => {
  const { OFFLINE_PROFILE: mockProfile } = require('../domain/profiles');
  return {
    useTonightPlan: () => ({
      plan: { profile: mockProfile, nightId: 'night-live-test' },
      nightId: 'night-live-test',
    }),
  };
});

const mockEnd = jest.fn().mockResolvedValue(undefined);
const mockArm = jest.fn().mockResolvedValue(true);
const mockTick = jest.fn();

jest.mock('../services/patchSession', () => ({
  createPatchSession: () => ({
    arm: mockArm,
    tick: mockTick,
    end: mockEnd,
  }),
}));

const mockStartDeliveryFlush = jest.fn();
const mockStopDeliveryFlush = jest.fn();

jest.mock('../services/patchTransport', () => ({
  getPatchTransport: () => ({
    startDeliveryFlush: mockStartDeliveryFlush,
    stopDeliveryFlush: mockStopDeliveryFlush,
  }),
}));

jest.mock('../ble/getPatchBleClient', () => ({
  getPatchBleClient: () => null,
}));

const mockPatchBle = {
  connected: true,
  connect: jest.fn(),
  enabled: false,
};

jest.mock('./usePatchBle', () => ({
  usePatchBle: () => mockPatchBle,
}));

const mockComputeEngineSnapshot = jest.fn();

jest.mock('../domain/profileEngine', () => ({
  computeEngineSnapshot: (...args: unknown[]) => mockComputeEngineSnapshot(...args),
}));

jest.mock('../ble/bleConfig', () => ({
  resolveBleEnabled: () => mockPatchBle.enabled,
  canStartPatchSession: (connected: boolean) => !mockPatchBle.enabled || connected,
}));

function defaultSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    t: 0.25,
    dose: 0.5,
    phaseIdx: 1,
    phaseProgress: 0.4,
    beforeBed: false,
    sessionEnded: false,
    ...overrides,
  };
}

function renderLiveSession() {
  let latest: ReturnType<typeof useLiveSession> | null = null;

  function Harness() {
    latest = useLiveSession();
    return null;
  }

  return {
    async run() {
      await act(async () => {
        TestRenderer.create(React.createElement(Harness));
        await Promise.resolve();
      });
      if (!latest) throw new Error('useLiveSession did not run');
      return latest;
    },
  };
}

describe('useLiveSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPatchBle.enabled = false;
    mockPatchBle.connected = true;
    mockComputeEngineSnapshot.mockReturnValue(defaultSnapshot());
    mockEnd.mockResolvedValue(undefined);
    mockArm.mockResolvedValue(true);
  });

  it('sets pending session on mount', async () => {
    await renderLiveSession().run();
    expect(mockSetPendingSession).toHaveBeenCalledWith({
      profileId: OFFLINE_PROFILE.id,
      startedAt: mockAppNow.toISOString(),
    });
  });

  it('starts delivery flush for the active night', async () => {
    await renderLiveSession().run();
    expect(mockStartDeliveryFlush).toHaveBeenCalledWith('night-live-test');
  });

  it('ticks patch session with engine snapshot values', async () => {
    await renderLiveSession().run();
    expect(mockTick).toHaveBeenCalledWith(
      expect.objectContaining({
        t: 0.25,
        dose: 0.5,
        phaseId: OFFLINE_PROFILE.phases[1]!.id,
        at: mockAppNow,
      }),
    );
  });

  it('navigates to debrief when the sleep window ends', async () => {
    mockComputeEngineSnapshot.mockReturnValue(defaultSnapshot({ sessionEnded: true }));

    await renderLiveSession().run();

    expect(mockEnd).toHaveBeenCalledWith('night-live-test');
    expect(mockReplace).toHaveBeenCalledWith('/debrief');
  });

  it('redirects home when BLE is required but patch is not connected', async () => {
    mockPatchBle.enabled = true;
    mockPatchBle.connected = false;

    await renderLiveSession().run();

    expect(mockReplace).toHaveBeenCalledWith('/');
    expect(mockSetPendingSession).not.toHaveBeenCalled();
  });

  it('arms BLE schedule when patch is connected', async () => {
    mockPatchBle.enabled = true;
    mockPatchBle.connected = true;

    await renderLiveSession().run();

    expect(mockArm).toHaveBeenCalled();
    expect(mockSetPendingSession).toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalledWith('/');
  });

  it('goToDebrief ends session and navigates', async () => {
    const session = await renderLiveSession().run();

    await act(async () => {
      session.goToDebrief();
      await Promise.resolve();
    });

    expect(mockEnd).toHaveBeenCalledWith('night-live-test');
    expect(mockReplace).toHaveBeenCalledWith('/debrief');
  });
});
