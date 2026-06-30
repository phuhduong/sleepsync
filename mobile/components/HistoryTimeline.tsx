import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts } from '../theme/tokens';
import { useCircadianColors } from '../theme/CircadianThemeProvider';
import { SmallCapsLabel } from './SmallCapsLabel';
import type { SessionRecord } from '../domain/profiles';
import { sessionAccessibilityLabel } from '../domain/sessionPresentation';

const RAIL_W = 44;
const ROW_MIN_H = 96;
const NODE = 15;
const SPINE_W = 3;
const SPINE_LEFT = (RAIL_W - SPINE_W) / 2;

type Props = {
  sessions: SessionRecord[];
  onSelectSession: (id: string) => void;
};

function TimelineRow({
  session,
  onPress,
}: {
  session: SessionRecord;
  onPress: () => void;
}) {
  const colors = useCircadianColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${sessionAccessibilityLabel(session)} Tap for details.`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rail}>
        <View
          style={[
            styles.node,
            { borderColor: colors.borderMid, backgroundColor: colors.surface },
          ]}
        />
      </View>

      <View style={styles.body}>
        <SmallCapsLabel style={{ marginBottom: 5 }}>{session.date}</SmallCapsLabel>
        <Text style={[styles.profile, { color: colors.text }]} numberOfLines={2}>
          {session.summary}
        </Text>
      </View>

      <View style={styles.chevronWrap}>
        <Feather name="chevron-right" size={22} color={colors.textTer} />
      </View>
    </Pressable>
  );
}

export function HistoryTimeline({ sessions, onSelectSession }: Props) {
  return (
    <View style={styles.wrap}>
      <LinearGradient
        pointerEvents="none"
        colors={[
          'rgba(255,255,255,0.07)',
          'rgba(255,255,255,0.14)',
          'rgba(255,255,255,0.07)',
        ]}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.spine}
      />
      <View style={styles.rows}>
        {sessions.map((session) => (
          <TimelineRow
            key={session.id}
            session={session}
            onPress={() => onSelectSession(session.id)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    position: 'relative',
  },
  spine: {
    position: 'absolute',
    left: SPINE_LEFT,
    top: 0,
    bottom: 0,
    width: SPINE_W,
    borderRadius: SPINE_W / 2,
    zIndex: 0,
  },
  rows: {
    zIndex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: 2,
    gap: 12,
  },
  rowPressed: {
    opacity: 0.88,
  },
  rail: {
    width: RAIL_W,
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: ROW_MIN_H,
  },
  node: {
    width: NODE + 6,
    height: NODE + 6,
    borderRadius: (NODE + 6) / 2,
    borderWidth: 2,
    zIndex: 2,
  },
  body: {
    flex: 1,
    minWidth: 0,
    paddingTop: 2,
    paddingBottom: 8,
  },
  profile: {
    fontFamily: fonts.bodyM,
    fontSize: 17,
    letterSpacing: -0.2,
    marginBottom: 5,
  },
  summary: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  chevronWrap: {
    justifyContent: 'center',
    alignSelf: 'center',
    paddingLeft: 2,
    marginRight: -2,
  },
});
