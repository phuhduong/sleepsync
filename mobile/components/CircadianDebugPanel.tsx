import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CIRCADIAN_DEBUG_PRESETS } from '../theme/circadianSchedule';
import { useCircadianDev, useCircadianTheme } from '../theme/CircadianThemeProvider';
import { formatDateAsClock, minutesSinceMidnight } from '../theme/simulatedTime';
import { fonts } from '../theme/tokens';
import { DEMO_FULL_SESSION_SECONDS } from '../utils/sessionDemo';
import { clearSessions } from '../utils/sessionLog';
import { useAppState } from '../state/AppState';

/**
 * Dev-only overlay to scrub or fast-forward simulated time. Stripped from production (`__DEV__`).
 */
export function CircadianDebugPanel() {
  const dev = useCircadianDev();
  const { phaseLabel, blendT, appNow } = useCircadianTheme();
  const { clearPendingSession } = useAppState();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [clearHistoryArmed, setClearHistoryArmed] = useState(false);

  if (!__DEV__ || !dev) return null;

  const {
    usesDeviceClock,
    followDeviceClock,
    setSimulatedMinutes,
    bumpSimulatedMinutes,
    demoAccelerating,
    setDemoAccelerating,
  } = dev;

  const fabLabel = demoAccelerating ? `⏱ ${phaseLabel} · fast` : `⏱ ${phaseLabel}`;
  const timeLabel = formatDateAsClock(appNow);

  const runClearHistory = async () => {
    setClearingHistory(true);
    try {
      await clearSessions();
      clearPendingSession();
      setClearHistoryArmed(false);
    } catch (e) {
      if (__DEV__) console.warn('[dev] clear history failed', e);
    } finally {
      setClearingHistory(false);
    }
  };

  const onClearHistoryPress = () => {
    if (!clearHistoryArmed) {
      setClearHistoryArmed(true);
      return;
    }
    void runClearHistory();
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { bottom: Math.max(insets.bottom, 12) + 56 }]}
    >
      {open ? (
        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.title}>Dev tools</Text>
            <Pressable
              onPress={() => {
                setOpen(false);
                setClearHistoryArmed(false);
              }}
              hitSlop={8}
            >
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>
          <Text style={styles.meta}>
            {phaseLabel} · {timeLabel}
            {usesDeviceClock ? ' (device clock)' : demoAccelerating ? ' (fast-forward)' : ' (scrubbed)'}
            {!usesDeviceClock && !demoAccelerating ? ` · blend ${Math.round(blendT * 100)}%` : ''}
          </Text>
          <View style={styles.presetRow}>
            {CIRCADIAN_DEBUG_PRESETS.map((p) => (
              <Pressable
                key={p.label}
                onPress={() => setSimulatedMinutes(p.minutes)}
                style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
              >
                <Text style={styles.chipText}>{p.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.stepRow}>
            <Pressable onPress={() => bumpSimulatedMinutes(-60)} style={styles.stepBtn}>
              <Text style={styles.stepText}>−1h</Text>
            </Pressable>
            <Pressable onPress={() => bumpSimulatedMinutes(-15)} style={styles.stepBtn}>
              <Text style={styles.stepText}>−15m</Text>
            </Pressable>
            <Pressable
              onPress={followDeviceClock}
              style={[styles.stepBtn, usesDeviceClock && styles.stepBtnActive]}
            >
              <Text style={[styles.stepText, usesDeviceClock && styles.stepTextActive]}>Device</Text>
            </Pressable>
            <Pressable onPress={() => bumpSimulatedMinutes(15)} style={styles.stepBtn}>
              <Text style={styles.stepText}>+15m</Text>
            </Pressable>
            <Pressable onPress={() => bumpSimulatedMinutes(60)} style={styles.stepBtn}>
              <Text style={styles.stepText}>+1h</Text>
            </Pressable>
          </View>

          <View style={styles.sectionDivider} />
          <Text style={styles.sectionLabel}>
            Fast-forward simulated clock — theme, Live session, and Live header time (~
            {DEMO_FULL_SESSION_SECONDS}s wall ≈ full night)
          </Text>
          <View style={styles.stepRow}>
            <Pressable
              onPress={() => setDemoAccelerating(false)}
              style={[styles.stepBtn, !demoAccelerating && styles.stepBtnActive]}
            >
              <Text style={[styles.stepText, !demoAccelerating && styles.stepTextActive]}>Paused</Text>
            </Pressable>
            <Pressable
              onPress={() => setDemoAccelerating(true)}
              style={[styles.stepBtn, demoAccelerating && styles.stepBtnActive]}
            >
              <Text style={[styles.stepText, demoAccelerating && styles.stepTextActive]}>
                Fast-forward
              </Text>
            </Pressable>
          </View>
          {!usesDeviceClock ? (
            <Text style={styles.hint}>
              Scrubbed: {Math.round(minutesSinceMidnight(appNow))} min since midnight
            </Text>
          ) : null}

          <View style={styles.sectionDivider} />
          <Text style={styles.sectionLabel}>
            History — clears AsyncStorage (@sleepsync/sessions). History tab updates immediately.
          </Text>
          <View style={styles.clearRow}>
            <Pressable
              onPress={onClearHistoryPress}
              disabled={clearingHistory}
              style={({ pressed }) => [
                styles.dangerBtn,
                clearHistoryArmed && styles.dangerBtnArmed,
                (pressed || clearingHistory) && styles.dangerBtnPressed,
              ]}
            >
              <Text style={styles.dangerBtnText}>
                {clearingHistory
                  ? 'Clearing…'
                  : clearHistoryArmed
                    ? 'Tap again to confirm'
                    : 'Clear all history'}
              </Text>
            </Pressable>
            {clearHistoryArmed ? (
              <Pressable onPress={() => setClearHistoryArmed(false)} hitSlop={8}>
                <Text style={styles.cancelClearText}>Cancel</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : (
        <Pressable
          onPress={() => setOpen(true)}
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        >
          <Text style={styles.fabText}>{fabLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
    alignItems: 'flex-end',
  },
  fab: {
    backgroundColor: 'rgba(12,13,18,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  fabPressed: { opacity: 0.85 },
  fabText: {
    fontFamily: fonts.bodyM,
    fontSize: 12,
    color: 'rgba(245,245,247,0.9)',
  },
  panel: {
    width: '100%',
    maxWidth: 390,
    alignSelf: 'center',
    backgroundColor: 'rgba(12,13,18,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.bodyS,
    fontSize: 13,
    color: 'rgba(245,245,247,0.9)',
    letterSpacing: 0.3,
  },
  close: {
    fontSize: 16,
    color: 'rgba(245,245,247,0.55)',
    paddingHorizontal: 4,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: 'rgba(245,245,247,0.55)',
    lineHeight: 18,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipPressed: { opacity: 0.8 },
  chipText: {
    fontFamily: fonts.bodyM,
    fontSize: 11,
    color: 'rgba(245,245,247,0.88)',
  },
  stepRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
  },
  stepBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  stepBtnActive: {
    backgroundColor: 'rgba(123,92,240,0.35)',
  },
  stepText: {
    fontFamily: fonts.bodyM,
    fontSize: 11,
    color: 'rgba(245,245,247,0.75)',
  },
  stepTextActive: {
    color: '#fff',
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginTop: 4,
  },
  sectionLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: 'rgba(245,245,247,0.45)',
    letterSpacing: 0.2,
    lineHeight: 16,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: 'rgba(245,245,247,0.35)',
  },
  clearRow: {
    gap: 8,
  },
  dangerBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(220,80,80,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(220,80,80,0.35)',
  },
  dangerBtnArmed: {
    backgroundColor: 'rgba(220,80,80,0.38)',
    borderColor: 'rgba(220,80,80,0.55)',
  },
  dangerBtnPressed: { opacity: 0.75 },
  dangerBtnText: {
    fontFamily: fonts.bodyM,
    fontSize: 12,
    color: 'rgba(255,180,180,0.95)',
  },
  cancelClearText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: 'rgba(245,245,247,0.45)',
    textAlign: 'center',
  },
});
