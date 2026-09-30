import Feather from '@expo/vector-icons/Feather';
import { memo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, layout, radius, spacing } from '@/theme';

import { AppText } from './AppText';
import type { FeatherIconName } from './icons';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'md' | 'sm';

export type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and blocks presses (form submit, checkout...). */
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: FeatherIconName;
  rightIcon?: FeatherIconName;
  /** Stretch to the parent's width. */
  fullWidth?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

type VariantStyle = { background: string; pressed: string; border: string; text: string };

const VARIANTS: Record<ButtonVariant, VariantStyle> = {
  primary: {
    background: colors.primary,
    pressed: colors.primaryDark,
    border: colors.primary,
    text: colors.white,
  },
  secondary: {
    background: colors.primaryLight,
    pressed: colors.primaryTrack,
    border: colors.primaryLight,
    text: colors.textPrimary,
  },
  outline: {
    background: colors.transparent,
    pressed: colors.primaryLight,
    border: colors.primary,
    text: colors.primary,
  },
  ghost: {
    background: colors.transparent,
    pressed: colors.primaryLight,
    border: colors.transparent,
    text: colors.primary,
  },
};

function ButtonBase({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  accessibilityLabel,
  style,
  testID,
}: ButtonProps) {
  const palette = VARIANTS[variant];
  const isInactive = disabled || loading;
  const height = size === 'sm' ? layout.buttonHeightSmall : layout.buttonHeight;
  // Small buttons are visually 36 dp but keep a 48 dp touch target.
  const slop = Math.max(0, Math.ceil((layout.minTouchTarget - height) / 2));

  return (
    <Pressable
      onPress={isInactive ? undefined : onPress}
      disabled={isInactive}
      hitSlop={slop > 0 ? { top: slop, bottom: slop } : undefined}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isInactive, busy: loading }}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          backgroundColor: pressed && !isInactive ? palette.pressed : palette.background,
          borderColor: palette.border,
        },
        size === 'sm' ? styles.paddingSmall : styles.paddingMedium,
        fullWidth ? styles.fullWidth : null,
        disabled && !loading ? styles.disabled : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.text} testID="button-spinner" />
      ) : (
        <View style={styles.content}>
          {leftIcon ? <Feather name={leftIcon} size={18} color={palette.text} /> : null}
          <AppText variant="label" style={{ color: palette.text }} numberOfLines={1}>
            {title}
          </AppText>
          {rightIcon ? <Feather name={rightIcon} size={18} color={palette.text} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.button,
    borderWidth: 1,
  },
  paddingMedium: { paddingHorizontal: spacing.xl },
  paddingSmall: { paddingHorizontal: spacing.lg },
  fullWidth: { alignSelf: 'stretch' },
  disabled: { opacity: 0.5 },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});

export const Button = memo(ButtonBase);
