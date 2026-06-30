import { ScrollView, View, Text, Pressable, TextInput } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../theme/tokens';
import { useCircadianColors } from '../theme/CircadianThemeProvider';
import { useThemedStyles } from '../theme/useThemedStyles';
import { SmallCapsLabel } from '../components/SmallCapsLabel';
import { SegmentedControl } from '../components/SegmentedControl';
import { DotScale } from '../components/DotScale';
import { PrimaryCTA } from '../components/PrimaryCTA';
import { useAppState } from '../state/AppState';
import { useTonightPlan } from '../state/TonightPlanContext';
import { OFFLINE_PROFILE, type SessionWoke } from '../domain/profiles';
import { invalidateSessionLog } from '../services/sessionLog';
import { ApiError } from '../services/http';
import { syncDebrief } from '../services/nightsApi';
import { syncGoogleHealthOutcome } from '../services/googleHealthApi';
import { getPatchTransport } from '../services/patchTransport';
import { timezoneName } from '../domain/sleepSchedule';
import { getUserId } from '../services/identity';
import { isOfflineNightId } from '../types/plan';
import { useGoogleHealth } from '../state/GoogleHealthContext';

export default function DebriefScreen() {
  const colors = useCircadianColors();
  const styles = useThemedStyles((c) => ({
    column: {
      flex: 1,
      width: '100%',
      maxWidth: 390,
      alignSelf: 'center',
    },
    heading: {
      fontFamily: fonts.hero,
      fontSize: 56,
      color: c.text,
      letterSpacing: -0.8,
      lineHeight: 58,
    },
    qLabel: {
      fontFamily: fonts.body,
      fontSize: 18,
      color: c.text,
      marginBottom: 14,
    },
    addNote: {
      color: c.textSec,
      fontFamily: fonts.body,
      fontSize: 14,
    },
    noteInput: {
      width: '100%',
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      padding: 14,
      color: c.text,
      fontFamily: fonts.body,
      fontSize: 14,
      height: 80,
      textAlignVertical: 'top',
    },
    skipText: { color: c.textTer, fontFamily: fonts.body, fontSize: 11, letterSpacing: 0.4, opacity: 0.7 },
    saveError: {
      color: c.dangerDim,
      fontFamily: fonts.body,
      fontSize: 13,
      textAlign: 'center',
      marginBottom: 10,
    },
  }));
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { pendingSession, clearPendingSession, bedtimeMinutes, wakeMinutes } = useAppState();
  const { plan: tonightPlan, nightId, clearPlan } = useTonightPlan();

  const [woke, setWoke] = useState<SessionWoke | null>(null);
  const [groggy, setGroggy] = useState<number | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { connected: googleHealthConnected } = useGoogleHealth();

  const canSave = woke !== null && groggy !== null;

  useEffect(() => {
    if (!nightId && !pendingSession) {
      router.replace('/' as never);
    }
  }, [nightId, pendingSession, router]);

  const offlineNight = isOfflineNightId(nightId);
  const offlineBlock =
    offlineNight && pendingSession
      ? 'Tonight\'s plan is offline-only. Connect to the server, refresh Tonight, then save your debrief.'
      : null;

  const skip = () => {
    clearPendingSession();
    if (offlineNight) clearPlan();
    router.replace('/' as never);
  };

  const save = async () => {
    if (!canSave || saving || saved) return;
    setSaving(true);
    setSaveError(null);
    const prof = tonightPlan?.profile ?? OFFLINE_PROFILE;
    const trimmedNote = note.trim() || undefined;
    const startedAt = pendingSession?.startedAt ?? new Date().toISOString();
    if (!nightId) {
      setSaveError('Complete a live session tonight before saving your debrief.');
      setSaving(false);
      return;
    }
    if (isOfflineNightId(nightId)) {
      setSaveError('Plan is offline-only. Start the SleepSync API and refresh Tonight before saving.');
      setSaving(false);
      return;
    }
    try {
      const transport = getPatchTransport();
      const deliveryFlushed = await transport.flushDeliveryLog(nightId);
      if (!deliveryFlushed) {
        setSaveError('Delivery log could not upload. Check your connection and try again.');
        setSaving(false);
        return;
      }
      const userId = await getUserId();
      const completedAt = new Date().toISOString();
      await syncDebrief(nightId, {
        userId,
        woke: woke!,
        groggy: groggy!,
        note: trimmedNote,
        completedAt,
        profileId: prof.id,
        startedAt,
      });
      if (googleHealthConnected) {
        try {
          await syncGoogleHealthOutcome({
            nightId,
            bedtimeMinutes,
            wakeMinutes,
            timezone: timezoneName(),
            dataNow: completedAt,
          });
        } catch (outcomeErr) {
          if (typeof __DEV__ !== 'undefined' && __DEV__) {
            console.warn('[debrief] google health outcome sync failed', outcomeErr);
          }
        }
      }
      invalidateSessionLog();
      clearPendingSession();
      clearPlan();
      setSaved(true);
      setTimeout(() => router.replace('/' as never), 1200);
    } catch (e) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[debrief] save failed', e);
      }
      if (e instanceof ApiError && e.status === 404) {
        setSaveError('Tonight\'s night was not found on the server. Refresh your plan and try again.');
      } else {
        setSaveError('Could not save. Check the API connection and try again.');
      }
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
    <ScrollView
      style={styles.column}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: insets.top + 24, paddingBottom: 32 + insets.bottom }}
    >
      <SmallCapsLabel style={{ marginBottom: 10 }}>Morning Debrief</SmallCapsLabel>
      <Text style={styles.heading}>Good{'\n'}Morning</Text>

      <View style={{ marginTop: 36 }}>
        <Text style={styles.qLabel}>Did you wake during the night?</Text>
        <SegmentedControl<SessionWoke>
          options={[
            { value: 'no', label: 'No' },
            { value: 'yes', label: 'Yes' },
            { value: 'unsure', label: "Can't Say" },
          ]}
          value={woke}
          onChange={setWoke}
        />
      </View>

      <View style={{ marginTop: 28 }}>
        <Text style={styles.qLabel}>How groggy do you feel?</Text>
        <DotScale value={groggy} max={5} onChange={setGroggy} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
          <SmallCapsLabel>None</SmallCapsLabel>
          <SmallCapsLabel>Very</SmallCapsLabel>
        </View>
      </View>

      <View style={{ marginTop: 24 }}>
        {!noteOpen ? (
          <Pressable onPress={() => setNoteOpen(true)}>
            <Text style={styles.addNote}>+ Add a note</Text>
          </Pressable>
        ) : (
          <View>
            <SmallCapsLabel style={{ marginBottom: 8 }}>Anything else?</SmallCapsLabel>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Optional note…"
              placeholderTextColor="rgba(245,245,247,0.28)"
              multiline
              style={styles.noteInput}
            />
          </View>
        )}
      </View>

      <View style={{ marginTop: 24 }}>
        {saved ? (
          <View style={{ alignItems: 'center', paddingVertical: 18 }}>
            <Text style={{ color: colors.accent, fontFamily: fonts.bodyM, fontSize: 14 }}>Debrief saved ✓</Text>
          </View>
        ) : (
          <>
            {saveError ?? offlineBlock ? (
              <Text style={styles.saveError}>{saveError ?? offlineBlock}</Text>
            ) : null}
            <PrimaryCTA
              label="Save & Done"
              onPress={save}
              disabled={!canSave || saving}
            />
          </>
        )}
      </View>

      <View style={{ marginTop: 18, alignItems: 'center' }}>
        <Pressable onPress={skip} hitSlop={6}>
          <Text style={styles.skipText}>
            {offlineNight
              ? 'Discard offline session and return to Tonight →'
              : 'Didn\'t use the patch tonight →'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
    </View>
  );
}
