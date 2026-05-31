import { ScrollView, View, Text, useWindowDimensions } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassPanel } from '../../components/GlassPanel';
import { fonts } from '../../theme/tokens';
import { useAppNow, useCircadianColors } from '../../theme/CircadianThemeProvider';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useAppState } from '../../state/AppState';
import { MobileTabScreen, MOBILE_COLUMN_MAX } from '../../components/MobileTabScreen';
import { SmallCapsLabel } from '../../components/SmallCapsLabel';
import { ProfileCurve, PROFILE_CURVE_PAD_X } from '../../components/ProfileCurve';
import { RiskCurveChart } from '../../components/RiskCurveChart';
import { OFFLINE_FALLBACK_PROFILE_ID, findProfile } from '../../utils/profiles';
import { GoogleHealthConnectCard } from '../../components/GoogleHealthConnectCard';
import { planProfileRationale, planStatusLine } from '../../utils/planCopy';
import { useTonightPlan } from '../../utils/useTonightPlan';
import { subscribeSessionLog } from '../../utils/sessionLog';
import { useGoogleHealth } from '../../state/GoogleHealthContext';

export default function ProfileScreen() {
  const colors = useCircadianColors();
  const styles = useThemedStyles((c) => ({
    column: {
      flex: 1,
      width: '100%',
      maxWidth: MOBILE_COLUMN_MAX,
      alignSelf: 'center',
      zIndex: 1,
    },
    screenTitle: {
      fontFamily: fonts.hero,
      fontSize: 44,
      color: c.text,
      letterSpacing: -0.8,
      marginBottom: 6,
    },
    statusLine: {
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 22,
      color: c.textSec,
      marginBottom: 20,
    },
    rationale: {
      marginTop: 14,
      fontSize: 14,
      color: c.textSec,
      fontFamily: fonts.body,
      lineHeight: 21,
    },
    riskSection: {
      marginTop: 20,
    },
    chartsBlock: {
      width: '100%',
    },
    chartAxis: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 10,
      paddingHorizontal: PROFILE_CURVE_PAD_X,
    },
    offlineNote: {
      marginTop: 14,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
      color: c.textTer,
    },
  }));
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const appNow = useAppNow();
  const { tonightPlan } = useAppState();
  const gh = useGoogleHealth();
  const [focusKey, setFocusKey] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setFocusKey((k) => k + 1);
    }, []),
  );

  useEffect(() => subscribeSessionLog(() => {
    setFocusKey((k) => k + 1);
  }), []);

  const { status, source } = useTonightPlan({
    appNow,
    focusKey,
    googleHealthConnected: gh.connected,
  });

  const contentW = Math.min(windowWidth, MOBILE_COLUMN_MAX);
  const chartFallbackW = Math.max(220, contentW - 48 - 32);
  const [chartW, setChartW] = useState(chartFallbackW);
  const profile = tonightPlan?.profile ?? findProfile(OFFLINE_FALLBACK_PROFILE_ID);
  const riskCurve = tonightPlan?.riskCurve ?? [];
  const statusLine = planStatusLine({
    tonightPlan,
    status,
    source,
    ghStatus: gh.status,
  });
  return (
    <MobileTabScreen aurora={false}>
      <View style={styles.column}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: insets.top + 12,
            paddingBottom: 32 + insets.bottom,
          }}
        >
          <Text style={styles.screenTitle}>{profile.name}</Text>
          <Text style={styles.statusLine}>{statusLine}</Text>

          <GlassPanel>
            <View
              style={styles.chartsBlock}
              onLayout={(e) => {
                const w = Math.floor(e.nativeEvent.layout.width);
                if (w > 0 && w !== chartW) setChartW(w);
              }}
            >
              <SmallCapsLabel style={{ marginBottom: 10 }}>Release</SmallCapsLabel>
              <ProfileCurve keyframes={profile.keyframes} width={chartW} height={120} />

              {riskCurve.length >= 2 ? (
                <View style={styles.riskSection}>
                  <SmallCapsLabel style={{ marginBottom: 10 }}>Wake risk</SmallCapsLabel>
                  <RiskCurveChart points={riskCurve} width={chartW} height={120} />
                </View>
              ) : null}
            </View>

            <View style={styles.chartAxis}>
              <SmallCapsLabel style={{ color: colors.textTer }}>Bed</SmallCapsLabel>
              <SmallCapsLabel style={{ color: colors.textTer }}>Wake</SmallCapsLabel>
            </View>

            <Text style={styles.rationale}>{planProfileRationale(profile.rationale)}</Text>

            {!tonightPlan ? (
              <Text style={styles.offlineNote}>
                Offline fallback curve — start the backend for a personalized plan
              </Text>
            ) : null}
          </GlassPanel>

          <GoogleHealthConnectCard
            connectionOnly
            planLoading={status === 'loading' && !tonightPlan}
          />
        </ScrollView>
      </View>
    </MobileTabScreen>
  );
}
