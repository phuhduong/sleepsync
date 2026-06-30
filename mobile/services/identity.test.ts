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

  it('generates a persisted UUID-shaped anonymous id', async () => {
    const id = await getUserId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(await AsyncStorage.getItem('@sleepsync/userId')).toBe(id);
    expect(await getUserId()).toBe(id);
  });
});
