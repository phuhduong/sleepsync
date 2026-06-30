import { Animated, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PatchSimulator } from '../components/PatchSimulator';
import { SmallCapsLabel } from '../components/SmallCapsLabel';
import { PhaseTimelineStrip } from '../components/PhaseTimelineStrip';
import { LiveAmbient } from '../components/LiveAmbient';
import { LiveCancelModal } from '../components/LiveCancelModal';
import { LiveSessionSheet } from '../components/LiveSessionSheet';
import { useCircadianColors } from '../theme/CircadianThemeProvider';
import { fonts } from '../theme/tokens';
import { useLiveSession } from '../hooks/useLiveSession';

const HOLD_BAR_WIDTH = 280;

export default function LiveScreen() {
  const colors = useCircadianColors();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const session = useLiveSession();
  const colWidth = Math.min(width, 390);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        column: {
          flex: 1,
          width: '100%',
          maxWidth: 390,
          alignSelf: 'center',
        },
        topBar: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 24,
          paddingBottom: 12,
        },
        timeText: {
          fontFamily: fonts.body,
          fontSize: 14,
          color: colors.textSec,
          fontVariant: ['tabular-nums'],
        },
        disconnectBanner: {
          marginHorizontal: 24,
          marginBottom: 8,
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: 12,
          backgroundColor: colors.surface2,
          borderWidth: 1,
          borderColor: colors.border,
        },
        disconnectText: {
          fontFamily: fonts.body,
          fontSize: 13,
          color: colors.textSec,
          lineHeight: 18,
        },
        disconnectAction: {
          marginTop: 6,
          fontFamily: fonts.bodyM,
          fontSize: 13,
          color: colors.accent,
        },
        heroWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 0 },
        phaseBlock: {
          alignItems: 'center',
          marginTop: 32,
          minHeight: 110,
          alignSelf: 'stretch',
        },
        phaseLayer: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          alignItems: 'center',
        },
        phaseName: {
          fontFamily: fonts.hero,
          fontSize: 44,
          color: colors.text,
          letterSpacing: -0.5,
        },
        nextPhase: {
          marginTop: 8,
          fontSize: 14,
          color: colors.textSec,
          fontFamily: fonts.body,
        },
        timelineAnchorValue: {
          fontFamily: fonts.bodyS,
          fontSize: 15,
          color: colors.text,
          fontVariant: ['tabular-nums'],
        },
        holdCancelPress: {
          marginTop: 20,
          alignItems: 'center',
          alignSelf: 'stretch',
          paddingVertical: 12,
        },
        holdTrack: {
          width: HOLD_BAR_WIDTH,
          height: 3,
          borderRadius: 2,
          backgroundColor: 'rgba(255,255,255,0.08)',
          overflow: 'hidden',
          marginBottom: 10,
        },
        holdFill: {
          height: '100%',
          borderRadius: 2,
          backgroundColor: colors.dangerDim,
        },
        cancelHint: {
          fontFamily: fonts.body,
          fontSize: 11,
          letterSpacing: 1.2,
          color: colors.textTer,
          opacity: 0.65,
        },
        timelineWrap: { paddingHorizontal: 24 },
      }),
    [colors],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.column}>
        <LiveAmbient width={colWidth} height={height} />
        <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.timeText}>{session.nowTime}</Text>
        </View>

        {session.bleDisconnected ? (
          <Pressable
            onPress={() => void session.reconnectPatch()}
            style={styles.disconnectBanner}
            accessibilityRole="button"
          >
            <Text style={styles.disconnectText}>
              {session.patchAutonomous
                ? 'Phone link lost — patch is still running tonight’s profile on its own.'
                : 'Patch disconnected — reconnect to resume phone sync.'}
            </Text>
            <Text style={styles.disconnectAction}>Tap to reconnect</Text>
          </Pressable>
        ) : null}

        <View style={styles.heroWrap}>
          <PatchSimulator
            dose={session.currentDose}
            isActive
            size={230}
            onPress={() => session.setSheetOpen(true)}
          />
          <View style={styles.phaseBlock}>
            {session.outgoingPhase ? (
              <Animated.View style={[styles.phaseLayer, { opacity: session.outOpacity }]}>
                <SmallCapsLabel style={{ marginBottom: 8 }}>Now</SmallCapsLabel>
                <Text style={styles.phaseName}>{session.outgoingPhase.name}</Text>
              </Animated.View>
            ) : null}
            <Animated.View style={[styles.phaseLayer, { opacity: session.inOpacity }]}>
              <SmallCapsLabel style={{ marginBottom: 8 }}>Now</SmallCapsLabel>
              <Text style={styles.phaseName}>{session.currentPhase.name}</Text>
              {session.nextPhase ? (
                <Text style={styles.nextPhase}>
                  {session.nextPhase.name} in {session.timeRemaining}
                </Text>
              ) : (
                <Text style={[styles.nextPhase, { color: colors.accent }]}>Final phase</Text>
              )}
            </Animated.View>
          </View>
        </View>

        <View style={[styles.timelineWrap, { paddingBottom: 36 + insets.bottom }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            <View style={{ flex: 1 }}>
              <SmallCapsLabel style={{ marginBottom: 4 }}>Bedtime</SmallCapsLabel>
              <Text style={styles.timelineAnchorValue}>{session.bedtimeLabel}</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <SmallCapsLabel style={{ marginBottom: 4 }}>Usual wake</SmallCapsLabel>
              <Text style={styles.timelineAnchorValue}>{session.wakeLabel}</Text>
            </View>
          </View>
          <PhaseTimelineStrip
            phases={session.profile.phases}
            currentIdx={session.currentPhaseIdx}
            phaseProgress={session.phaseProgress}
          />
          <Pressable
            onPressIn={session.cancelHoldStart}
            onPressOut={session.cancelHoldEnd}
            style={styles.holdCancelPress}
            accessibilityRole="button"
            accessibilityLabel="Hold to cancel session"
          >
            <View style={styles.holdTrack}>
              <Animated.View
                style={[
                  styles.holdFill,
                  {
                    width: session.holdProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, HOLD_BAR_WIDTH],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={styles.cancelHint}>HOLD TO CANCEL SESSION</Text>
          </Pressable>
        </View>
      </View>

      <LiveCancelModal
        visible={session.cancelConfirm}
        topInset={insets.top}
        bottomInset={insets.bottom}
        onDismiss={() => session.setCancelConfirm(false)}
        onConfirm={() => {
          session.setCancelConfirm(false);
          session.goToDebrief();
        }}
      />

      <LiveSessionSheet
        visible={session.sheetOpen}
        onClose={() => session.setSheetOpen(false)}
        intensityPct={session.intensityPct}
        phaseIndex={session.currentPhaseIdx}
        phaseCount={session.profile.phases.length}
        beforeBed={session.beforeBed}
        minutesUntilBed={session.minutesUntilBed}
        minutesSinceBed={session.minutesSinceBed}
        keyframes={session.profile.keyframes}
        currentT={session.elapsed}
      />
    </View>
  );
}
