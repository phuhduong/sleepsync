import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, OpenSans_400Regular, OpenSans_500Medium, OpenSans_600SemiBold } from '@expo-google-fonts/open-sans';
import { CormorantGaramond_600SemiBold } from '@expo-google-fonts/cormorant-garamond';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NIGHT_COLORS } from '../theme/circadianPalettes';
import { CircadianDebugPanel } from '../components/CircadianDebugPanel';
import { CircadianThemeProvider, useCircadianTheme } from '../theme/CircadianThemeProvider';
import { AppStateProvider } from '../state/AppState';
import { GoogleHealthProvider } from '../state/GoogleHealthContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const { colors, statusBarStyle } = useCircadianTheme();
  return (
    <>
      <StatusBar style={statusBarStyle} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="live" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="debrief" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
      <CircadianDebugPanel />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    OpenSans_400Regular,
    OpenSans_500Medium,
    OpenSans_600SemiBold,
    CormorantGaramond_600SemiBold,
  });
  const [fontsTimedOut, setFontsTimedOut] = useState(false);
  const ready = fontsLoaded || fontsTimedOut;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Blocked font CDNs on web can leave fontsLoaded false — mount UI with system fallbacks.
  useEffect(() => {
    const t = setTimeout(() => setFontsTimedOut(true), 4000);
    return () => clearTimeout(t);
  }, []);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: NIGHT_COLORS.bg }} />;
  }

  return (
    <SafeAreaProvider>
      <CircadianThemeProvider>
        <AppStateProvider>
          <GoogleHealthProvider>
            <RootNavigator />
          </GoogleHealthProvider>
        </AppStateProvider>
      </CircadianThemeProvider>
    </SafeAreaProvider>
  );
}
