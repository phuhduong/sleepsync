import { Pressable, StyleSheet, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { fonts } from '../theme/tokens';

type IconProps = { on: boolean };

const HomeIcon = ({ on }: IconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"
    stroke={on ? '#fff' : 'rgba(245,245,247,0.35)'} strokeWidth={1.6}
    strokeLinecap="round" strokeLinejoin="round">
    <Path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
    <Path d="M9 21V12h6v9" />
  </Svg>
);

const ProfileIcon = ({ on }: IconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"
    stroke={on ? '#fff' : 'rgba(245,245,247,0.35)'} strokeWidth={1.6}
    strokeLinecap="round" strokeLinejoin="round">
    <Path d="M3 18 C7 18, 8 8, 12 8 C16 8, 17 14, 21 14" />
  </Svg>
);

const HistoryIcon = ({ on }: IconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"
    stroke={on ? '#fff' : 'rgba(245,245,247,0.35)'} strokeWidth={1.6}
    strokeLinecap="round" strokeLinejoin="round">
    <Circle cx={12} cy={12} r={9} />
    <Path d="M12 7v5l3.5 3.5" />
  </Svg>
);

const ICONS: Record<string, (p: IconProps) => React.ReactElement> = {
  index:    HomeIcon,
  profile:  ProfileIcon,
  history:  HistoryIcon,
};

const LABELS: Record<string, string> = {
  index:    'Tonight',
  profile:  'Profile',
  history:  'History',
};

export function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <BlurView
      intensity={40}
      tint="dark"
      style={[
        styles.bar,
        { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: 'rgba(9,10,14,0.85)' },
      ]}
    >
      {state.routes.map((route, i) => {
        const active = state.index === i;
        const Icon = ICONS[route.name];
        if (!Icon) return null;
        return (
          <Pressable
            key={route.key}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!active && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
            style={styles.tab}
          >
            <Icon on={active} />
            <Text style={[styles.label, { color: active ? 'rgba(245,245,247,0.88)' : 'rgba(245,245,247,0.32)' }]}>
              {LABELS[route.name]}
            </Text>
          </Pressable>
        );
      })}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    gap: 4,
  },
  label: {
    fontFamily: fonts.bodyM,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
