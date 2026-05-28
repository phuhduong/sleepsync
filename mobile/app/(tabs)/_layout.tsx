import { Tabs } from 'expo-router';
import { BottomTabBar } from '../../components/BottomTabBar';
import { GoogleHealthFocusRefresh } from '../../components/GoogleHealthFocusRefresh';
import { useCircadianColors } from '../../theme/CircadianThemeProvider';

export default function TabsLayout() {
  const colors = useCircadianColors();
  return (
    <>
    <GoogleHealthFocusRefresh />
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
      tabBar={(props) => <BottomTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Tonight' }} />
      <Tabs.Screen name="profile"  options={{ title: 'Profile' }} />
      <Tabs.Screen name="history"  options={{ title: 'History' }} />
    </Tabs>
    </>
  );
}
