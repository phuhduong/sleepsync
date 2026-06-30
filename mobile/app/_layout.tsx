import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, OpenSans_400Regular, OpenSans_500Medium, OpenSans_600SemiBold } from '@expo-google-fonts/open-sans';
import { CormorantGaramond_600SemiBold } from '@expo-google-fonts/cormorant-garamond';
import { useEffect, useRef, useState, type ComponentType } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NIGHT_COLORS } from '../theme/circadianPalettes';
import { CircadianThemeProvider, useAppNow, useCircadianTheme } from '../theme/CircadianThemeProvider';
import { AppStateProvider, useAppState } from '../state/AppState';
import { GoogleHealthProvider } from '../state/GoogleHealthContext';
import { TonightPlanProvider } from '../state/TonightPlanContext';
import { resolvePendingSessionRoute } from '../domain/sessionResume';

SplashScreen.preventAutoHideAsync().catch(() => {});

let DevDebugPanel: ComponentType | null = null;
if (__DEV__) {
  // Dev-only: keep out of production bundle.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  DevDebugPanel = require('../components/CircadianDebugPanel').CircadianDebugPanel;
}

function SessionResumeHandler() {
  const router = useRouter();
  const segments = useSegments();
  const appNow = useAppNow();
  const { pendingSession, bedtimeMinutes, wakeMinutes, hydrated } = useAppState();
  const resumedRef = useRef(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!pendingSession) {
      resumedRef.current = false;
      return;
    }
    if (resumedRef.current) return;

    const top = segments[0];
    if (top === 'live' || top === 'debrief') return;

    const route = resolvePendingSessionRoute({
      now: appNow,
      pendingSession,
      bedtimeMinutes,
      wakeMinutes,
    });
    if (!route) return;

    resumedRef.current = true;
    router.replace(route as never);
  }, [hydrated, pendingSession, bedtimeMinutes, wakeMinutes, appNow, segments, router]);

  return null;
}

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
      {DevDebugPanel ? <DevDebugPanel /> : null}
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

  // Web font CDN blocked: mount UI with system fallbacks.
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
            <TonightPlanProvider>
              <SessionResumeHandler />
              <RootNavigator />
            </TonightPlanProvider>
          </GoogleHealthProvider>
        </AppStateProvider>
      </CircadianThemeProvider>
    </SafeAreaProvider>
  );
}
