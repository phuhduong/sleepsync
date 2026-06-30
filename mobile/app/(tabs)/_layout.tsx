import { Tabs } from 'expo-router';
import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { BottomTabBar } from '../../components/BottomTabBar';
import { useGoogleHealth } from '../../state/GoogleHealthContext';
import { useCircadianColors } from '../../theme/CircadianThemeProvider';

export default function TabsLayout() {
  const colors = useCircadianColors();
  const { refresh } = useGoogleHealth();
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
      tabBar={(props) => <BottomTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Tonight' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
    </Tabs>
  );
}
