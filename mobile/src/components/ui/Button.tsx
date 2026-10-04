import Feather from '@expo/vector-icons/Feather';
import { memo, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { layout, radius, shadows, spacing, useTheme } from '@/theme';
import type { FontFamilyToken, Palette } from '@/theme';

import { AppText } from './AppText';
import type { FeatherIconName } from './icons';

/**
 * `primary`   neon pill, dark label - THE call to action (one per screen section).
 * `secondary` raised neutral pill (surface fill + hairline) - the alternative action.
 * `outline`   accent hairline, accent label - tertiary, on photos / cards.
 * `ghost`     text-only accent label - inline actions.
 */
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
  /** Custom node instead of `leftIcon` (an icon that Feather does not have, e.g. filter-list). */
  leftAdornment?: ReactNode;
  /** Label font; default `bodyBold`. */
  labelFamily?: FontFamilyToken;
  /** Render the label in upper case (Home banner CTA). */
  uppercase?: boolean;
  /** Stretch to the parent's width. */
  fullWidth?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

type VariantStyle = { background: string; pressed: string; border: string; text: string };

function getVariantStyle(colors: Palette, variant: ButtonVariant): VariantStyle {
  switch (variant) {
    case 'primary':
      return {
        background: colors.primary,
        pressed: colors.primaryPressed,
        border: colors.primary,
        text: colors.onPrimary,
      };
    case 'secondary':
      return {
        background: colors.surface,
        pressed: colors.border,
        border: colors.border,
        text: colors.text,
      };
    case 'outline':
      return {
        background: colors.transparent,
        pressed: colors.primarySoft,
        border: colors.primaryText,
        text: colors.primaryText,
      };
    case 'ghost':
      return {
        background: colors.transparent,
        pressed: colors.primarySoft,
        border: colors.transparent,
        text: colors.primaryText,
      };
  }
}

function ButtonBase({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  leftAdornment,
  labelFamily,
  uppercase = false,
  fullWidth = false,
  accessibilityLabel,
  style,
  testID,
}: ButtonProps) {
  const { colors, isDark } = useTheme();
  const palette = getVariantStyle(colors, variant);
  const isInactive = disabled || loading;
  const iconSize = size === 'sm' ? 18 : 20;
  const height = size === 'sm' ? layout.buttonHeightSmall : layout.buttonHeight;
  // Small buttons are visually 40 dp but keep a 48 dp touch target.
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
          minHeight: height,
          backgroundColor: pressed && !isInactive ? palette.pressed : palette.background,
          borderColor: palette.border,
        },
        size === 'sm' ? styles.paddingSmall : styles.paddingMedium,
        variant === 'primary' && isDark && !isInactive ? shadows.glow : null,
        pressed && !isInactive ? styles.pressed : null,
        fullWidth ? styles.fullWidth : null,
        disabled && !loading ? styles.disabled : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.text} testID="button-spinner" />
      ) : (
        <View style={styles.content}>
          {leftAdornment ??
            (leftIcon ? <Feather name={leftIcon} size={iconSize} color={palette.text} /> : null)}
          <AppText
            variant="label"
            family={labelFamily ?? 'bodyBold'}
            uppercase={uppercase}
            style={[
              styles.label,
              size === 'md' ? styles.labelMedium : null,
              { color: palette.text },
            ]}
          >
            {title}
          </AppText>
          {rightIcon ? <Feather name={rightIcon} size={iconSize} color={palette.text} /> : null}
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
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingVertical: spacing.xs,
  },
  paddingMedium: { paddingHorizontal: spacing.xxl },
  paddingSmall: { paddingHorizontal: spacing.lg },
  pressed: { transform: [{ scale: 0.98 }] },
  fullWidth: { alignSelf: 'stretch' },
  disabled: { opacity: 0.5 },
  content: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  // A long label (or a large system font) wraps instead of being cut off.
  label: { flexShrink: 1, textAlign: 'center' },
  labelMedium: { fontSize: 15, lineHeight: 20 },
});

export const Button = memo(ButtonBase);
