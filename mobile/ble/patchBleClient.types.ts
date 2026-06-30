import type { Keyframe } from '../domain/profiles';
import type { SleepWindow } from '../domain/sleepWindow';

export type PatchBleConnectionState =
  | 'unsupported'
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

export type PatchBleClient = {
  isSupported(): boolean;
  isConnected(): boolean;
  getState(): PatchBleConnectionState;
  getError(): string | null;
  connect(): Promise<void>;
  writeDose(dose: number): Promise<void>;
  writeProfileSchedule(
    sleepWindow: SleepWindow,
    now: Date,
    keyframes: Keyframe[],
  ): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(listener: (state: PatchBleConnectionState) => void): () => void;
};
