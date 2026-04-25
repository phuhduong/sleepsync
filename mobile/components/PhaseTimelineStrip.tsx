import { View } from 'react-native';
import { colors } from '../theme/tokens';
import type { Phase } from '../utils/profiles';

type Props = {
  phases: Phase[];
  currentIdx: number;
  phaseProgress: number;
};

export function PhaseTimelineStrip({ phases, currentIdx, phaseProgress }: Props) {
  return (
    <View style={{ flexDirection: 'row', gap: 3, width: '100%', alignItems: 'center' }}>
      {phases.map((ph, i) => {
        const isPast = i < currentIdx;
        const isCur = i === currentIdx;
        return (
          <View
            key={i}
            style={{
              flex: ph.duration,
              height: 3,
              borderRadius: 2,
              overflow: 'hidden',
              backgroundColor: isPast ? 'rgba(123,92,240,0.45)' : 'rgba(245,245,247,0.1)',
            }}
          >
            {isCur && (
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: `${Math.max(0, Math.min(1, phaseProgress)) * 100}%`,
                  backgroundColor: colors.accent,
                  borderRadius: 2,
                }}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}
