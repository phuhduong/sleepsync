import { StyleSheet, View } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { SmallCapsLabel } from './SmallCapsLabel';
import { StatNumber } from './StatNumber';
import { ProfileCurve } from './ProfileCurve';
import type { Keyframe } from '../domain/profiles';
import { useCircadianColors } from '../theme/CircadianThemeProvider';

type LiveSessionSheetProps = {
  visible: boolean;
  onClose: () => void;
  intensityPct: number;
  phaseIndex: number;
  phaseCount: number;
  beforeBed: boolean;
  minutesUntilBed: number;
  minutesSinceBed: number;
  keyframes: Keyframe[];
  currentT: number;
};

export function LiveSessionSheet({
  visible,
  onClose,
  intensityPct,
  phaseIndex,
  phaseCount,
  beforeBed,
  minutesUntilBed,
  minutesSinceBed,
  keyframes,
  currentT,
}: LiveSessionSheetProps) {
  const colors = useCircadianColors();

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={{ flexDirection: 'row' }}>
        {([
          ['Intensity', `${intensityPct}%`],
          ['Phase', `${phaseIndex + 1} / ${phaseCount}`],
          [
            beforeBed ? 'Until bed' : 'Since bed',
            beforeBed ? `${minutesUntilBed}m` : `${minutesSinceBed}m`,
          ],
        ] as const).map(([label, val], i) => (
          <View
            key={label}
            style={{
              flex: 1,
              borderRightWidth: i < 2 ? StyleSheet.hairlineWidth : 0,
              borderRightColor: colors.border,
            }}
          >
            <StatNumber value={val} label={label} size={44} />
          </View>
        ))}
      </View>
      <View style={{ marginTop: 28 }}>
        <SmallCapsLabel style={{ marginBottom: 12 }}>Delivery Profile</SmallCapsLabel>
        <ProfileCurve keyframes={keyframes} width={330} height={90} currentT={currentT} />
      </View>
    </BottomSheet>
  );
}
