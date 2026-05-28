import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useGoogleHealth } from '../state/GoogleHealthContext';

/** Re-fetch connection status when any tab gains focus (keeps Home + Profile in sync). */
export function GoogleHealthFocusRefresh() {
  const { refresh } = useGoogleHealth();
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );
  return null;
}
