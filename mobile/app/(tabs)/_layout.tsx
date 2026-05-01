import { Tabs } from 'expo-router';
import { BottomTabBar } from '../../components/BottomTabBar';
import { colors } from '../../theme/tokens';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
      tabBar={(props) => <BottomTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Tonight' }} />
      <Tabs.Screen name="profile"  options={{ title: 'Profile' }} />
      <Tabs.Screen name="history"  options={{ title: 'History' }} />
    </Tabs>
  );
}
