import Feather from '@expo/vector-icons/Feather';
import { memo } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { AppText } from './AppText';
import type { FeatherIconName } from './icons';

export type ChipProps = {
  label: string;
  /**
   * `outline` = primary border + primary text (hot topics, unselected star filters).
   * `filled`  = solid primary with dark text (white on primary is only 2,27:1) (the selected "All" chip).
   */
  variant?: 'outline' | 'filled';
  /** A selected chip always renders filled. Announced as "selected" to screen readers. */
  selected?: boolean;
  leftIcon?: FeatherIconName;
  /**
   * `md` = 36 dp high, 12 dp padding (default, Hot topics / filters).
   * `sm` = 28 dp high, 8 dp padding (compact chip rows); the touch target is padded to 48 dp.
   */
  size?: 'md' | 'sm';
  /** When omitted the chip is a static label. */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

function ChipBase({
  label,
  variant = 'outline',
  selected = false,
  leftIcon,
  size = 'md',
  onPress,
  style,
  testID,
}: ChipProps) {
  const isFilled = variant === 'filled' || selected;
  const textColor = isFilled ? colors.textOnPrimary : colors.primaryText;
  const slop = size === 'sm' ? 10 : 6;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      hitSlop={{ top: slop, bottom: slop }}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.small : null,
        isFilled ? styles.filled : styles.outline,
        pressed ? styles.pressed : null,
        style,
      ]}
    >
      {leftIcon ? <Feather name={leftIcon} size={14} color={textColor} /> : null}
      <AppText variant="body" family="bodyMedium" style={{ color: textColor }} numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    // Design: 12 dp from the chip edge to the text, border included.
    paddingHorizontal: spacing.md - 1,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  small: { minHeight: 28, paddingHorizontal: spacing.sm - 1 },
  outline: { backgroundColor: colors.background },
  filled: { backgroundColor: colors.primary },
  pressed: { opacity: 0.7 },
});

export const Chip = memo(ChipBase);
