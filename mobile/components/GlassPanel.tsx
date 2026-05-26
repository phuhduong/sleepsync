import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

/** Shared frosted shell — keep in sync across Tonight sheet, Profile, History, modals. */
export const GLASS_BORDER = 'rgba(255,255,255,0.09)';
export const GLASS_BG = 'rgba(12,13,18,0.82)';
export const GLASS_BG_MODAL = 'rgba(12,13,18,0.88)';

const INNER_PAD: ViewStyle = {
  paddingHorizontal: 16,
  paddingVertical: 18,
};

const SHEET_PAD: ViewStyle = {
  paddingHorizontal: 24,
  paddingTop: 28,
};

type Variant = 'card' | 'sheetTop' | 'modal';

const SHELL: Record<Variant, ViewStyle> = {
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    backgroundColor: GLASS_BG,
  },
  sheetTop: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: GLASS_BORDER,
    backgroundColor: GLASS_BG,
  },
  modal: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    backgroundColor: GLASS_BG_MODAL,
  },
};

type Props = {
  children: ReactNode;
  /** `card` — rounded panel; `sheetTop` — bottom sheet lip; `modal` — slightly denser fill. */
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
  /** Merged with default inner padding when `padded` is true. */
  innerStyle?: StyleProp<ViewStyle>;
  /** Wrap children in padded inner view (default true). */
  padded?: boolean;
  intensity?: number;
  pointerEvents?: 'box-none' | 'none' | 'box-only' | 'auto';
};

/**
 * BlurView glass surface used across tabs and modals. Prefer this over one-off
 * `BlurView` + `rgba(12,13,18,0.82)` copies so radius, border, and fill stay aligned.
 */
export function GlassPanel({
  children,
  variant = 'card',
  style,
  innerStyle,
  padded = true,
  intensity = 28,
  pointerEvents,
}: Props) {
  const shellPad = variant === 'sheetTop' && padded ? SHEET_PAD : undefined;
  const useInner = padded && variant !== 'sheetTop';

  return (
    <BlurView
      intensity={intensity}
      tint="dark"
      pointerEvents={pointerEvents}
      style={[SHELL[variant], shellPad, style]}
    >
      {useInner ? (
        <View style={[INNER_PAD, innerStyle]}>{children}</View>
      ) : (
        children
      )}
    </BlurView>
  );
}
