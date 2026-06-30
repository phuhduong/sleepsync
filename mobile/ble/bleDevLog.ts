export function bleDevLog(event: string, detail?: Record<string, unknown>): void {
  if (!__DEV__) return;
  if (detail !== undefined) {
    console.log(`[patchBle] ${event}`, detail);
  } else {
    console.log(`[patchBle] ${event}`);
  }
}
