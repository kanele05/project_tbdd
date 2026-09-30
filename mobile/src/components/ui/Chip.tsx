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
   * `filled`  = solid primary with white text (the selected "All" chip).
   */
  variant?: 'outline' | 'filled';
  /** A selected chip always renders filled. Announced as "selected" to screen readers. */
  selected?: boolean;
  leftIcon?: FeatherIconName;
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
  onPress,
  style,
  testID,
}: ChipProps) {
  const isFilled = variant === 'filled' || selected;
  const textColor = isFilled ? colors.white : colors.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      hitSlop={{ top: 6, bottom: 6 }}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
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
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  outline: { backgroundColor: colors.background },
  filled: { backgroundColor: colors.primary },
  pressed: { opacity: 0.7 },
});

export const Chip = memo(ChipBase);
