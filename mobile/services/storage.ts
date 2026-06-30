import AsyncStorage from '@react-native-async-storage/async-storage';

export async function storageGetItem(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch (err) {
    if (__DEV__) console.warn(`[storage] getItem failed for ${key}`, err);
    return null;
  }
}

export async function storageSetItem(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (err) {
    if (__DEV__) console.warn(`[storage] setItem failed for ${key}`, err);
  }
}

export async function storageRemoveItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (err) {
    if (__DEV__) console.warn(`[storage] removeItem failed for ${key}`, err);
  }
}
