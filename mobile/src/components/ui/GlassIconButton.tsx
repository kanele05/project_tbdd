import Feather from '@expo/vector-icons/Feather';
import { memo } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { darkPalette, layout } from '@/theme';

import { GlassSurface } from './GlassSurface';
import type { FeatherIconName } from './icons';

export type GlassIconButtonProps = {
  icon: FeatherIconName;
  /** Required: icon-only buttons need a screen-reader label. */
  accessibilityLabel: string;
  onPress?: () => void;
  /** Visible diameter in dp (default 48). Below 48 the touch target is padded with `hitSlop`. */
  size?: number;
  /** Highlights the icon in neon (saved / liked / selected). Also announced as `selected`. */
  isActive?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Round frosted button that sits on a photo (back, share, bookmark on a hero or a poster). */
function GlassIconButtonBase({
  icon,
  accessibilityLabel,
  onPress,
  size = layout.minTouchTarget,
  isActive = false,
  disabled = false,
  style,
  testID,
}: GlassIconButtonProps) {
  const slop = Math.max(0, Math.ceil((layout.minTouchTarget - size) / 2));
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      hitSlop={slop > 0 ? { top: slop, bottom: slop, left: slop, right: slop } : undefined}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: isActive, disabled }}
      testID={testID}
      style={({ pressed }) => [pressed ? styles.pressed : null, style]}
    >
      <GlassSurface
        tone="photo"
        intensity={30}
        radius={size / 2}
        contentStyle={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      >
        <Feather
          name={icon}
          size={Math.round(size * 0.46)}
          // Always drawn on dark glass: white, or the dark-mode neon when active.
          color={isActive ? darkPalette.primary : darkPalette.white}
        />
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.75, transform: [{ scale: 0.96 }] },
});

export const GlassIconButton = memo(GlassIconButtonBase);
