jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageGetItem, storageSetItem } from './storage';

describe('storage helpers', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('storageSetItem delegates to AsyncStorage', async () => {
    await storageSetItem('@test/key', 'value');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@test/key', 'value');
  });

  it('storageGetItem returns null when AsyncStorage throws', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disk full'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(storageGetItem('@test/key')).resolves.toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
