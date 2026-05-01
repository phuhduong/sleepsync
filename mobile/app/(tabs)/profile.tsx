import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { colors, fonts } from '../../theme/tokens';
import { formatMinutesAsTime12h } from '../../utils/sleepSchedule';
import { useAppState } from '../../state/AppState';
import { MobileTabScreen, MOBILE_COLUMN_MAX } from '../../components/MobileTabScreen';
import { SmallCapsLabel } from '../../components/SmallCapsLabel';
import { ProfileCurve } from '../../components/ProfileCurve';
import { PrimaryCTA } from '../../components/PrimaryCTA';
import { StatNumber } from '../../components/StatNumber';
import { ScheduleTimePickerModal } from '../../components/ScheduleTimePickerModal';
import { profiles, type Profile } from '../../utils/profiles';

const PROFILE_COUNT = profiles.length;
const SPRING = { damping: 22, stiffness: 220, mass: 0.85 };

const EYEBROW = 'Tonight';

export default function ProfileSelectionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { selectedProfileId, setSelectedProfileId, bedtimeMinutes, setBedtimeMinutes, wakeMinutes, setWakeMinutes } =
    useAppState();
  const [pickerTarget, setPickerTarget] = useState<'bed' | 'wake' | null>(null);
  const [idx, setIdx] = useState(() =>
    Math.max(0, profiles.findIndex(p => p.id === selectedProfileId)),
  );

  const contentW = Math.min(windowWidth, MOBILE_COLUMN_MAX);
  const scrollPad = 48;
  const glassInnerPad = 32;
  const slideW = Math.max(260, contentW - scrollPad - glassInnerPad);
  const curveW = slideW - 8;

  const translateX = useSharedValue(-idx * slideW);
  const slideWidthSV = useSharedValue(slideW);
  const dragStartX = useSharedValue(0);

  useEffect(() => {
    slideWidthSV.value = slideW;
  }, [slideW, slideWidthSV]);

  useEffect(() => {
    translateX.value = withSpring(-idx * slideW, SPRING);
  }, [idx, slideW, translateX]);

  const profile = profiles[idx];

  const confirm = () => {
    setSelectedProfileId(profile.id);
    router.navigate('/(tabs)' as never);
  };

  const openPick = (which: 'bed' | 'wake') => {
    setPickerTarget(which);
  };

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-14, 14])
        .failOffsetY([-18, 18])
        .onBegin(() => {
          dragStartX.value = translateX.value;
        })
        .onUpdate((e) => {
          const w = slideWidthSV.value;
          const minX = -(PROFILE_COUNT - 1) * w;
          const maxX = 0;
          let x = dragStartX.value + e.translationX;
          if (x > maxX) x = maxX + (x - maxX) * 0.28;
          else if (x < minX) x = minX + (x - minX) * 0.28;
          translateX.value = x;
        })
        .onEnd((e) => {
          const w = slideWidthSV.value;
          const pos = -translateX.value / w;
          let target = Math.round(pos);
          if (e.velocityX < -520) target = Math.ceil(pos);
          if (e.velocityX > 520) target = Math.floor(pos);
          target = Math.max(0, Math.min(PROFILE_COUNT - 1, target));
          translateX.value = withSpring(-target * w, { ...SPRING, velocity: e.velocityX });
          runOnJS(setIdx)(target);
        }),
    [dragStartX, slideWidthSV, translateX],
  );

  const carouselStyle = useAnimatedStyle(() => ({
    flexDirection: 'row',
    width: slideWidthSV.value * PROFILE_COUNT,
    transform: [{ translateX: translateX.value }],
  }));

  const renderSlide = (p: Profile) => (
    <View key={p.id} style={[styles.slide, { width: slideW }]}>
      {p.recommended && (
        <View style={styles.recBadge}>
          <View style={styles.recDot} />
          <SmallCapsLabel style={{ color: colors.accent }}>Recommended</SmallCapsLabel>
        </View>
      )}
      <Text style={styles.profileName}>{p.name}</Text>
      <Text style={styles.rationale}>{p.rationale}</Text>

      <View style={styles.curveWrap}>
        <ProfileCurve keyframes={p.keyframes} width={curveW} height={140} />
      </View>
    </View>
  );

  return (
    <MobileTabScreen aurora={false}>
      <GestureHandlerRootView style={styles.gestureRoot}>
      <View style={styles.column}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: insets.top + 12,
            paddingBottom: 160,
          }}
        >
          <SmallCapsLabel style={styles.eyebrow}>{EYEBROW}</SmallCapsLabel>
          <Text style={styles.screenTitle}>Profile</Text>

          <BlurView intensity={28} tint="dark" style={styles.carouselGlass}>
            <View style={styles.carouselGlassInner}>
              <View style={[styles.carouselClip, { width: slideW }]}>
                <GestureDetector gesture={panGesture}>
                  <Animated.View style={carouselStyle}>{profiles.map(renderSlide)}</Animated.View>
                </GestureDetector>
              </View>

              <View style={styles.dotIndicators}>
                {profiles.map((_, i) => (
                  <Pressable
                    key={i}
                    onPress={() => setIdx(i)}
                    hitSlop={8}
                    style={{
                      width: i === idx ? 18 : 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: i === idx ? colors.accent : 'rgba(255,255,255,0.15)',
                    }}
                  />
                ))}
              </View>
            </View>
          </BlurView>

          <View style={styles.timeRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Bedtime ${formatMinutesAsTime12h(bedtimeMinutes)}, tap to change`}
              onPress={() => openPick('bed')}
              style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.85 : 1 }]}
            >
              <StatNumber
                value={formatMinutesAsTime12h(bedtimeMinutes)}
                label="Bedtime"
                size={28}
                style={{ alignItems: 'flex-start' }}
              />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Wake ${formatMinutesAsTime12h(wakeMinutes)}, tap to change`}
              onPress={() => openPick('wake')}
              style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.85 : 1 }]}
            >
              <StatNumber
                value={formatMinutesAsTime12h(wakeMinutes)}
                label="Wake"
                size={28}
                style={{ alignItems: 'flex-end' }}
              />
            </Pressable>
          </View>
        </ScrollView>

        <BlurView
          intensity={28}
          tint="dark"
          style={[styles.pinnedGlass, { paddingBottom: 28 + insets.bottom }]}
        >
          <PrimaryCTA label="Use This Profile" onPress={confirm} />
        </BlurView>

        <ScheduleTimePickerModal
          target={pickerTarget}
          bedtimeMinutes={bedtimeMinutes}
          wakeMinutes={wakeMinutes}
          onDismiss={() => setPickerTarget(null)}
          onApply={(which, mins) => {
            if (which === 'bed') setBedtimeMinutes(mins);
            else setWakeMinutes(mins);
          }}
        />
      </View>
      </GestureHandlerRootView>
    </MobileTabScreen>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
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
    color: colors.text,
    letterSpacing: -0.8,
    marginBottom: 4,
  },
  carouselGlass: {
    marginTop: 20,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(12,13,18,0.82)',
  },
  carouselGlassInner: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 18,
  },
  carouselClip: {
    overflow: 'hidden',
    alignSelf: 'center',
  },
  slide: {
    paddingHorizontal: 4,
  },
  recBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.accentDim,
    borderWidth: 1,
    borderColor: colors.accentMid,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  recDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.accent },
  profileName: {
    fontFamily: fonts.hero,
    fontSize: 44,
    color: colors.text,
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  rationale: {
    marginTop: 4,
    fontSize: 14,
    color: colors.textSec,
    fontFamily: fonts.body,
    lineHeight: 22,
    marginBottom: 18,
  },
  curveWrap: {
    paddingTop: 8,
  },
  dotIndicators: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: 14,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  pinnedGlass: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    paddingHorizontal: 24,
    paddingTop: 28,
    overflow: 'hidden',
    backgroundColor: 'rgba(12,13,18,0.82)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.09)',
  },
});
