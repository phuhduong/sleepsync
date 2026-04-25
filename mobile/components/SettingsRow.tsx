import { Pressable, Text, View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme/tokens';
import { SmallCapsLabel } from './SmallCapsLabel';

export function Toggle({ value, onChange }: { value: boolean; onChange?: (v: boolean) => void }) {
  return (
    <Pressable
      onPress={() => onChange?.(!value)}
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        backgroundColor: value ? colors.accent : 'rgba(255,255,255,0.12)',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: 3,
          left: value ? 21 : 3,
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: '#fff',
          shadowColor: '#000',
          shadowOpacity: 0.4,
          shadowRadius: 2,
          shadowOffset: { width: 0, height: 1 },
          elevation: 2,
        }}
      />
    </Pressable>
  );
}

type RowProps = {
  label: string;
  sub?: string;
  value?: string;
  toggle?: boolean;
  onToggle?: (v: boolean) => void;
  arrow?: boolean;
  last?: boolean;
};

export function SettingsRow({ label, sub, value, toggle, onToggle, arrow, last }: RowProps) {
  return (
    <View style={[rowStyles.row, !last && rowStyles.divider]}>
      <View style={{ flex: 1 }}>
        <Text style={rowStyles.label}>{label}</Text>
        {sub && <Text style={rowStyles.sub}>{sub}</Text>}
      </View>
      {value !== undefined && (
        <Text style={[rowStyles.value, { marginRight: arrow ? 6 : 0 }]}>{value}</Text>
      )}
      {toggle !== undefined && <Toggle value={toggle} onChange={onToggle} />}
      {arrow && (
        <Svg width={7} height={12} viewBox="0 0 7 12" fill="none" style={{ marginLeft: 6 }}>
          <Path d="M1 1l5 5-5 5" stroke="rgba(245,245,247,0.25)" strokeWidth={1.6} strokeLinecap="round" />
        </Svg>
      )}
    </View>
  );
}

export function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <SmallCapsLabel style={{ marginBottom: 8, paddingLeft: 2 }}>{title}</SmallCapsLabel>
      <View
        style={{
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 18,
          paddingHorizontal: 18,
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  label: { fontSize: 15, color: colors.text, fontFamily: 'Inter_400Regular' },
  sub:   { fontSize: 12, color: colors.textTer, marginTop: 2, fontFamily: 'Inter_400Regular' },
  value: { fontSize: 13, color: colors.textSec, fontFamily: 'Inter_400Regular' },
});
