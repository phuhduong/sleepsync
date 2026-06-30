export function resolveBleEnabled(): boolean {
  return process.env.EXPO_PUBLIC_BLE_ENABLED === '1';
}

export function canStartPatchSession(patchConnected: boolean): boolean {
  if (!resolveBleEnabled()) return true;
  return patchConnected;
}
