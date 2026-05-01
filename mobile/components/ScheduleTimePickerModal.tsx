import { Modal, View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors, fonts } from '../theme/tokens';
import {
  clampMinutes,
  clockMinutesFromDate,
  dateFromClockMinutes,
  DEFAULT_BEDTIME_MINUTES,
  formatMinutesAsTime12h,
} from '../utils/sleepSchedule';
import { SmallCapsLabel } from './SmallCapsLabel';

export type SchedulePickTarget = 'bed' | 'wake';

type Props = {
  target: SchedulePickTarget | null;
  bedtimeMinutes: number;
  wakeMinutes: number;
  onDismiss: () => void;
  onApply: (which: SchedulePickTarget, minutes: number) => void;
};

export function ScheduleTimePickerModal({
  target,
  bedtimeMinutes,
  wakeMinutes,
  onDismiss,
  onApply,
}: Props) {
  const insets = useSafeAreaInsets();
  const [pickerDate, setPickerDate] = useState(() => dateFromClockMinutes(DEFAULT_BEDTIME_MINUTES));

  useEffect(() => {
    if (target === 'bed') setPickerDate(dateFromClockMinutes(bedtimeMinutes));
    else if (target === 'wake') setPickerDate(dateFromClockMinutes(wakeMinutes));
  }, [target, bedtimeMinutes, wakeMinutes]);

  const confirmPick = () => {
    if (!target) return;
    const mins = clockMinutesFromDate(pickerDate);
    onApply(target, mins);
    onDismiss();
  };

  const onAndroidTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    const t = target;
    if (Platform.OS === 'android') {
      onDismiss();
    }
    if (event.type === 'dismissed') {
      return;
    }
    if (date && t) {
      const mins = clockMinutesFromDate(date);
      onApply(t, mins);
    }
  };

  const bumpPickerMinutes = (delta: number) => {
    const m = clampMinutes(clockMinutesFromDate(pickerDate) + delta);
    setPickerDate(dateFromClockMinutes(m));
  };

  const showIosPickerSheet = target !== null && Platform.OS === 'ios';
  const showWebPickerSheet = target !== null && Platform.OS === 'web';
  const showAndroidPicker = target !== null && Platform.OS === 'android';

  return (
    <>
      <Modal
        visible={showIosPickerSheet || showWebPickerSheet}
        transparent
        animationType="fade"
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
        onRequestClose={onDismiss}
      >
        <GestureHandlerRootView style={styles.modalGestureRoot}>
          <View style={styles.modalRoot}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss time picker"
              style={styles.modalBackdropFlex}
              onPress={onDismiss}
            />
            <BlurView intensity={28} tint="dark" style={[styles.timeSheetGlass, { paddingBottom: 20 + insets.bottom }]}>
              <SmallCapsLabel style={styles.timeSheetEyebrow}>{target === 'bed' ? 'Bedtime' : 'Wake'}</SmallCapsLabel>
              {Platform.OS === 'ios' ? (
                <DateTimePicker
                  value={pickerDate}
                  mode="time"
                  display="spinner"
                  themeVariant="dark"
                  textColor={colors.text}
                  minuteInterval={1}
                  onChange={(event, date) => {
                    if (event.type === 'dismissed') return;
                    if (date) setPickerDate(date);
                  }}
                  style={styles.timeWheel}
                />
              ) : (
                <View style={styles.webPickWrap}>
                  <Text style={styles.webPickValue}>{formatMinutesAsTime12h(clockMinutesFromDate(pickerDate))}</Text>
                  <View style={styles.webPickRow}>
                    <Pressable onPress={() => bumpPickerMinutes(-60)} style={styles.webPickBtn}>
                      <Text style={styles.webPickBtnText}>−1 hr</Text>
                    </Pressable>
                    <Pressable onPress={() => bumpPickerMinutes(-15)} style={styles.webPickBtn}>
                      <Text style={styles.webPickBtnText}>−15 min</Text>
                    </Pressable>
                    <Pressable onPress={() => bumpPickerMinutes(15)} style={styles.webPickBtn}>
                      <Text style={styles.webPickBtnText}>+15 min</Text>
                    </Pressable>
                    <Pressable onPress={() => bumpPickerMinutes(60)} style={styles.webPickBtn}>
                      <Text style={styles.webPickBtnText}>+1 hr</Text>
                    </Pressable>
                  </View>
                </View>
              )}
              <Pressable onPress={confirmPick} style={styles.timeDone}>
                <Text style={styles.timeDoneText}>Done</Text>
              </Pressable>
            </BlurView>
          </View>
        </GestureHandlerRootView>
      </Modal>

      {showAndroidPicker ? (
        <DateTimePicker value={pickerDate} mode="time" display="default" onChange={onAndroidTimeChange} />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  modalGestureRoot: {
    flex: 1,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: 'rgba(7,8,12,0.82)',
  },
  modalBackdropFlex: {
    flex: 1,
    width: '100%',
  },
  timeSheetGlass: {
    paddingHorizontal: 24,
    paddingTop: 22,
    overflow: 'hidden',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(12,13,18,0.82)',
  },
  timeSheetEyebrow: {
    marginBottom: 14,
    color: colors.textTer,
  },
  timeWheel: {
    alignSelf: 'stretch',
    height: 216,
    width: '100%',
  },
  webPickWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
  webPickValue: {
    fontFamily: fonts.bodyS,
    fontSize: 32,
    color: colors.text,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  webPickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  webPickBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  webPickBtnText: {
    fontFamily: fonts.bodyM,
    fontSize: 14,
    color: colors.text,
  },
  timeDone: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.09)',
  },
  timeDoneText: {
    fontFamily: fonts.bodyM,
    fontSize: 17,
    color: colors.accent,
  },
});
