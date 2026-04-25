import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/tokens';
import { SmallCapsLabel } from '../../components/SmallCapsLabel';
import { SettingsRow, SettingsSection } from '../../components/SettingsRow';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [bedReminder, setBedReminder] = useState(true);
  const [debriefAlert, setDebriefAlert] = useState(true);
  const [shareData, setShareData] = useState(false);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: insets.top + 12, paddingBottom: 32 }}
    >
      <View style={{ marginBottom: 28 }}>
        <SmallCapsLabel style={{ marginBottom: 6 }}>Account</SmallCapsLabel>
        <Text style={styles.heading}>Settings</Text>
      </View>

      <View style={styles.patientCard}>
        <View style={styles.patientGlyph}>
          <Text style={{ fontSize: 20, color: colors.accent }}>◈</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.patientName}>Alex Rivera</Text>
          <Text style={styles.patientSub}>Patient since March 2026</Text>
        </View>
        <View style={styles.activeRxBadge}>
          <SmallCapsLabel style={{ color: colors.accent }}>Active Rx</SmallCapsLabel>
        </View>
      </View>

      <SettingsSection title="Device">
        <SettingsRow label="Patch Connected" value="●  Paired" />
        <SettingsRow label="Controller Battery" value="87%" />
        <SettingsRow label="Firmware" value="v2.1.4" arrow last />
      </SettingsSection>

      <SettingsSection title="Schedule">
        <SettingsRow label="Bedtime Reminder" sub="Notify at 10:00 PM" toggle={bedReminder} onToggle={setBedReminder} />
        <SettingsRow label="Morning Debrief Alert" sub="Notify at 6:30 AM" toggle={debriefAlert} onToggle={setDebriefAlert} />
        <SettingsRow label="Quiet Hours" value="10 PM – 7 AM" arrow last />
      </SettingsSection>

      <SettingsSection title="Prescription">
        <SettingsRow label="Prescribing Physician" value="Dr. A. Patel" arrow />
        <SettingsRow label="Patches Remaining" value="14 of 30" />
        <SettingsRow label="Refill Due" value="May 15, 2026" arrow last />
      </SettingsSection>

      <SettingsSection title="Data & Privacy">
        <SettingsRow label="Share with Care Team" sub="Anonymized session data" toggle={shareData} onToggle={setShareData} />
        <SettingsRow label="Export Session History" arrow />
        <SettingsRow label="Privacy Policy" arrow last />
      </SettingsSection>

      <SettingsSection title="App">
        <SettingsRow label="App Version" value="1.0.0 (beta)" />
        <SettingsRow label="Send Feedback" arrow last />
      </SettingsSection>

      <View style={{ paddingBottom: 16, alignItems: 'center' }}>
        <SmallCapsLabel>SleepSync · Prescription Medical Device</SmallCapsLabel>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heading: { fontFamily: 'Inter_600SemiBold', fontSize: 28, color: colors.text, letterSpacing: -0.5 },
  patientCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  patientGlyph: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.accentDim,
    borderWidth: 1,
    borderColor: colors.accentMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientName: { fontFamily: 'Inter_600SemiBold', fontSize: 17, color: colors.text },
  patientSub: { fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.textSec, marginTop: 2 },
  activeRxBadge: {
    backgroundColor: colors.accentDim,
    borderWidth: 1,
    borderColor: colors.accentMid,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
