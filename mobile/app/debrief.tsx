import { ScrollView, View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme/tokens';
import { SmallCapsLabel } from '../components/SmallCapsLabel';
import { SegmentedControl } from '../components/SegmentedControl';
import { DotScale } from '../components/DotScale';
import { PrimaryCTA } from '../components/PrimaryCTA';

type Woke = 'no' | 'yes' | 'unsure';

export default function DebriefScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [woke, setWoke] = useState<Woke | null>(null);
  const [groggy, setGroggy] = useState<number | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);

  const canSave = woke !== null && groggy !== null;

  const save = () => {
    if (!canSave) return;
    setSaved(true);
    setTimeout(() => router.replace('/' as never), 1200);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
    <ScrollView
      style={styles.column}
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: insets.top + 24, paddingBottom: 32 + insets.bottom }}
    >
      <SmallCapsLabel style={{ marginBottom: 10 }}>Morning Debrief</SmallCapsLabel>
      <Text style={styles.heading}>Good{'\n'}morning</Text>

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
          <PrimaryCTA label="Save & Done" onPress={save} disabled={!canSave} />
        )}
      </View>

      <View style={{ marginTop: 18, alignItems: 'center' }}>
        <Pressable onPress={() => router.replace('/' as never)} hitSlop={6}>
          <Text style={styles.skipText}>Didn&apos;t use the patch tonight →</Text>
        </Pressable>
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    flex: 1,
    width: '100%',
    maxWidth: 390,
    alignSelf: 'center',
  },
  heading: {
    fontFamily: fonts.hero,
    fontSize: 56,
    color: colors.text,
    letterSpacing: -0.8,
    lineHeight: 58,
  },
  qLabel: {
    fontFamily: fonts.body,
    fontSize: 18,
    color: colors.text,
    marginBottom: 14,
  },
  addNote: {
    color: colors.textSec,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  noteInput: {
    width: '100%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 14,
    height: 80,
    textAlignVertical: 'top',
  },
  skipText: { color: colors.textTer, fontFamily: fonts.body, fontSize: 11, letterSpacing: 0.4, opacity: 0.7 },
});
