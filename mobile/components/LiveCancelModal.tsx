import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { GlassPanel } from './GlassPanel';
import { SmallCapsLabel } from './SmallCapsLabel';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fonts } from '../theme/tokens';

type LiveCancelModalProps = {
  visible: boolean;
  topInset: number;
  bottomInset: number;
  onDismiss: () => void;
  onConfirm: () => void;
};

export function LiveCancelModal({
  visible,
  topInset,
  bottomInset,
  onDismiss,
  onConfirm,
}: LiveCancelModalProps) {
  const styles = useThemedStyles((c) => ({
    confirmRoot: { flex: 1 },
    confirmDim: { backgroundColor: 'rgba(7,8,12,0.82)' },
    confirmCenter: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    confirmGlass: { width: '100%', maxWidth: 390, alignSelf: 'center' },
    confirmEyebrow: { marginBottom: 12 },
    confirmHeading: {
      fontFamily: fonts.hero,
      fontSize: 32,
      color: c.text,
      letterSpacing: -0.4,
      marginBottom: 12,
    },
    confirmBody: {
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 22,
      color: c.textSec,
      marginBottom: 20,
    },
    confirmDangerCta: {
      backgroundColor: c.danger,
      borderRadius: 999,
      paddingVertical: 16,
      alignItems: 'center',
    },
    confirmDangerLabel: {
      fontFamily: fonts.body,
      fontSize: 15,
      letterSpacing: 0.2,
      color: 'rgba(245,245,247,0.95)',
    },
    confirmSecondary: {
      alignItems: 'center',
      paddingVertical: 16,
      marginTop: 4,
    },
    confirmSecondaryLabel: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: c.textTer,
      letterSpacing: 0.2,
    },
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.confirmRoot}>
        <Pressable
          style={[StyleSheet.absoluteFillObject, styles.confirmDim]}
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        />
        <View
          style={[
            styles.confirmCenter,
            { paddingTop: Math.max(topInset, 20), paddingBottom: Math.max(bottomInset, 20) },
          ]}
          pointerEvents="box-none"
        >
          <GlassPanel variant="modal" padded={false} style={styles.confirmGlass}>
            <SmallCapsLabel style={styles.confirmEyebrow}>Tonight · Live session</SmallCapsLabel>
            <Text style={styles.confirmHeading}>End delivery early?</Text>
            <Text style={styles.confirmBody}>
              The patch stops following your overnight profile. You can still open the morning debrief
              when you&apos;re up.
            </Text>
            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [styles.confirmDangerCta, pressed && { opacity: 0.92 }]}
              accessibilityRole="button"
              accessibilityLabel="Stop session and go to debrief"
            >
              <Text style={styles.confirmDangerLabel}>Stop & debrief</Text>
            </Pressable>
            <Pressable
              onPress={onDismiss}
              style={styles.confirmSecondary}
              hitSlop={10}
              accessibilityRole="button"
            >
              <Text style={styles.confirmSecondaryLabel}>Keep tonight&apos;s session running</Text>
            </Pressable>
          </GlassPanel>
        </View>
      </View>
    </Modal>
  );
}
