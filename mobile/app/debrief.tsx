import { ScrollView, View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/tokens';
import { findProfile } from '../utils/profiles';
import { useAppState } from '../state/AppState';
import { SmallCapsLabel } from '../components/SmallCapsLabel';
import { ProfileCurve } from '../components/ProfileCurve';
import { SegmentedControl } from '../components/SegmentedControl';
import { DotScale } from '../components/DotScale';
import { PrimaryCTA } from '../components/PrimaryCTA';

type Woke = 'no' | 'yes' | 'unsure';

export default function DebriefScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedProfileId } = useAppState();
  const profile = findProfile(selectedProfileId);

  const [woke, setWoke] = useState<Woke | null>(null);
  const [groggy, setGroggy] = useState<number | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);

  const canSave = woke !== null && groggy !== null;

  const save = () => {
    if (!canSave) return;
    setSaved(true);
    setTimeout(() => router.replace('/(tabs)' as never), 1200);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: insets.top + 24, paddingBottom: 32 + insets.bottom }}
    >
      <SmallCapsLabel style={{ marginBottom: 10 }}>Morning Debrief</SmallCapsLabel>
      <Text style={styles.heading}>Good{'\n'}morning.</Text>

      <View style={styles.timelineCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <SmallCapsLabel>{profile.name}</SmallCapsLabel>
          <SmallCapsLabel>10:30 PM — 6:30 AM</SmallCapsLabel>
        </View>
        <ProfileCurve keyframes={profile.keyframes} width={318} height={60} showLabels={false} mini />
      </View>

      <View style={{ marginTop: 28 }}>
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
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <SmallCapsLabel>None</SmallCapsLabel>
          <SmallCapsLabel>Very</SmallCapsLabel>
        </View>
        <DotScale value={groggy} max={5} onChange={setGroggy} />
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

      <View style={{ marginTop: 12, marginBottom: 24 }}>
        <Pressable onPress={() => router.replace('/(tabs)' as never)}>
          <Text style={styles.skipText}>Didn&apos;t use the patch tonight →</Text>
        </Pressable>
      </View>

      {saved ? (
        <View style={{ alignItems: 'center', paddingVertical: 18 }}>
          <Text style={{ color: colors.accent, fontFamily: 'Inter_600SemiBold', fontSize: 15 }}>Debrief saved ✓</Text>
        </View>
      ) : (
        <PrimaryCTA label="Save & Done" onPress={save} disabled={!canSave} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 44,
    color: colors.text,
    letterSpacing: -1.1,
    lineHeight: 46,
  },
  timelineCard: {
    marginTop: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  qLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: colors.text,
    marginBottom: 14,
  },
  addNote: {
    color: colors.textTer,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  noteInput: {
    width: '100%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    color: colors.text,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    height: 80,
    textAlignVertical: 'top',
  },
  skipText: { color: colors.textTer, fontFamily: 'Inter_400Regular', fontSize: 12, letterSpacing: 0.4 },
});
