jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { _resetUserIdForTests, getUserId } from './identity';

describe('getUserId', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await _resetUserIdForTests();
  });

  it('generates and persists a UUID-shaped id on first call', async () => {
    const id = await getUserId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    const stored = await AsyncStorage.getItem('@sleepsync/userId');
    expect(stored).toBe(id);
  });

  it('returns the same id across calls', async () => {
    const a = await getUserId();
    const b = await getUserId();
    expect(a).toBe(b);
  });
});
