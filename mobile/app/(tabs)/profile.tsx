import { ScrollView, View, Text, useWindowDimensions } from 'react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthCard } from '../../components/AuthCard';
import { GlassPanel } from '../../components/GlassPanel';
import { fonts } from '../../theme/tokens';
import { useCircadianColors } from '../../theme/CircadianThemeProvider';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTonightPlan } from '../../state/TonightPlanContext';
import { MobileTabScreen, MOBILE_COLUMN_MAX } from '../../components/MobileTabScreen';
import { SmallCapsLabel } from '../../components/SmallCapsLabel';
import { ProfileCurve, PROFILE_CURVE_PAD_X } from '../../components/ProfileCurve';
import { riskPointsToKeyframes } from '../../domain/riskCurvePath';
import { OFFLINE_PROFILE } from '../../domain/profiles';
import { planProfileRationale } from '../../domain/planCopy';

const EYEBROW = 'Your Profile';

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
    eyebrow: {
      marginBottom: 10,
    },
    screenTitle: {
      fontFamily: fonts.hero,
      fontSize: 44,
      color: c.text,
      letterSpacing: -0.8,
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
  }));
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { plan: tonightPlan } = useTonightPlan();

  const contentW = Math.min(windowWidth, MOBILE_COLUMN_MAX);
  const chartFallbackW = Math.max(220, contentW - 48 - 32);
  const [chartW, setChartW] = useState(chartFallbackW);
  const profile = tonightPlan?.profile ?? OFFLINE_PROFILE;
  const riskCurve = tonightPlan?.riskCurve ?? [];
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
          <SmallCapsLabel style={styles.eyebrow}>{EYEBROW}</SmallCapsLabel>
          <Text style={styles.screenTitle}>{profile.name}</Text>

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
                  <ProfileCurve
                    keyframes={riskPointsToKeyframes(riskCurve)}
                    width={chartW}
                    height={120}
                  />
                </View>
              ) : null}
            </View>

            <View style={styles.chartAxis}>
              <SmallCapsLabel style={{ color: colors.textTer }}>Bed</SmallCapsLabel>
              <SmallCapsLabel style={{ color: colors.textTer }}>Wake</SmallCapsLabel>
            </View>

            <Text style={styles.rationale}>{planProfileRationale(profile.rationale)}</Text>
          </GlassPanel>

          <AuthCard />
        </ScrollView>
      </View>
    </MobileTabScreen>
  );
}
