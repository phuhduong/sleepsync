import { ScrollView, View, Text, Pressable, TextInput } from 'react-native';
import { useState } from 'react';
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
import { OFFLINE_FALLBACK_PROFILE_ID, findProfile } from '../utils/profiles';
import { appendSession } from '../utils/sessionLog';
import { planRationaleLine } from '../utils/planCopy';
import { syncDebrief } from '../utils/apiClient';
import { syncGoogleHealthOutcomeAfterDebrief } from '../utils/googleHealthOutcomeSync';
import { flushDeliveryLog } from '../utils/flushDeliveryLog';
import { getPatchTransport } from '../utils/patchTransportInstance';
import { getUserId } from '../utils/identity';
import { useGoogleHealth } from '../utils/useGoogleHealth';
import type { SessionWoke } from '../utils/profiles';

type Woke = SessionWoke;

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
  const {
    pendingSession,
    clearPendingSession,
    nightId,
    tonightPlan,
    bedtimeMinutes,
    wakeMinutes,
  } = useAppState();

  const [woke, setWoke] = useState<Woke | null>(null);
  const [groggy, setGroggy] = useState<number | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { connected: googleHealthConnected } = useGoogleHealth();

  const canSave = woke !== null && groggy !== null;

  const skip = () => {
    clearPendingSession();
    router.replace('/' as never);
  };

  const save = async () => {
    if (!canSave || saving || saved) return;
    setSaving(true);
    setSaveError(null);
    const prof =
      tonightPlan?.profile ??
      findProfile(pendingSession?.profileId ?? OFFLINE_FALLBACK_PROFILE_ID);
    const trimmedNote = note.trim() || undefined;
    const startedAt = pendingSession?.startedAt ?? new Date().toISOString();
    try {
      const record = await appendSession({
        profileId: prof.id,
        profile: prof.name,
        keyframes: prof.keyframes,
        rationale: planRationaleLine(prof.rationale),
        bedtimeMinutes,
        wakeMinutes,
        woke: woke!,
        groggy: groggy!,
        note: trimmedNote,
      });
      // Sync to backend if a night was generated. Local save is the source of
      // truth; we don't block the user on backend success.
      if (nightId) {
        await flushDeliveryLog(getPatchTransport(), nightId);
        try {
          const userId = await getUserId();
          await syncDebrief(nightId, {
            userId,
            woke: woke!,
            groggy: groggy!,
            note: trimmedNote,
            completedAt: record.completedAt,
            profileId: prof.id,
            startedAt,
          });
          if (googleHealthConnected) {
            try {
              await syncGoogleHealthOutcomeAfterDebrief({
                nightId,
                bedtimeMinutes,
                wakeMinutes,
                now: new Date(record.completedAt),
              });
            } catch (outcomeErr) {
              if (typeof __DEV__ !== 'undefined' && __DEV__) {
                console.warn('[debrief] google health outcome sync failed', outcomeErr);
              }
            }
          }
        } catch (syncErr) {
          if (typeof __DEV__ !== 'undefined' && __DEV__) {
            console.warn('[debrief] backend sync failed', syncErr);
          }
        }
      }
      clearPendingSession();
      setSaved(true);
      setTimeout(() => router.replace('/' as never), 1200);
    } catch (e) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[debrief] save failed', e);
      }
      setSaveError('Could not save. Try again.');
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
        <SegmentedControl<Woke>
          options={[
            { value: 'no', label: 'No' },
            { value: 'yes', label: 'Yes' },
            { value: 'unsure', label: "Can't say" },
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
            {saveError ? <Text style={styles.saveError}>{saveError}</Text> : null}
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
          <Text style={styles.skipText}>Didn&apos;t use the patch tonight →</Text>
        </Pressable>
      </View>
    </ScrollView>
    </View>
  );
}
