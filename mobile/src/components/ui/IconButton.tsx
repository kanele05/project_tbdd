import Feather from '@expo/vector-icons/Feather';
import { memo } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, layout, radius } from '@/theme';
import type { ColorToken } from '@/theme';

import { Badge } from './Badge';
import type { FeatherIconName } from './icons';

export type IconButtonProps = {
  icon: FeatherIconName;
  onPress?: () => void;
  /** Required: icon-only buttons need a screen-reader label (CLAUDE.md §7). */
  accessibilityLabel: string;
  /** Icon size in dp. Default 24. */
  size?: number;
  color?: ColorToken;
  /** Visible square size; the touch target is always padded up to 48 dp with `hitSlop`. */
  containerSize?: number;
  /** Filled circular background (e.g. white circle over a hero image). */
  filled?: boolean;
  disabled?: boolean;
  /** Small count bubble in the top-right corner (cart / notification bell). */
  badgeCount?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

function IconButtonBase({
  icon,
  onPress,
  accessibilityLabel,
  size = 24,
  color = 'textPrimary',
  containerSize = layout.minTouchTarget,
  filled = false,
  disabled = false,
  badgeCount,
  style,
  testID,
}: IconButtonProps) {
  const slop = Math.max(0, Math.ceil((layout.minTouchTarget - containerSize) / 2));
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={slop > 0 ? { top: slop, bottom: slop, left: slop, right: slop } : undefined}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        { width: containerSize, height: containerSize },
        filled ? styles.filled : null,
        pressed ? styles.pressed : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      <Feather name={icon} size={size} color={colors[color]} />
      {badgeCount != null && badgeCount > 0 ? (
        <View style={styles.badge} pointerEvents="none">
          <Badge count={badgeCount} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  filled: { backgroundColor: colors.white },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.4 },
  badge: { position: 'absolute', top: 4, right: 4 },
});

export const IconButton = memo(IconButtonBase);
