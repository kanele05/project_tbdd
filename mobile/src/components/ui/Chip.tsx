import Feather from '@expo/vector-icons/Feather';
import { memo } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles, radius, spacing, useTheme } from '@/theme';

import { AppText } from './AppText';
import type { FeatherIconName } from './icons';

export type ChipProps = {
  label: string;
  /**
   * `outline` = hairline border + normal text (unselected topic / filter chips).
   * `filled`  = solid neon with dark text (a strong, always-on tag).
   */
  variant?: 'outline' | 'filled';
  /**
   * Selected = accent hairline + soft accent tint + accent text (concept B topic chips).
   * Announced as "selected" to screen readers.
   */
  selected?: boolean;
  leftIcon?: FeatherIconName;
  /**
   * `md` = 40 dp high, 16 dp padding (default, topics / filters), touch target padded to 48 dp.
   * `sm` = 32 dp high, 12 dp padding (compact chip rows), touch target padded to 48 dp.
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
  const { colors } = useTheme();
  const styles = useStyles();
  const isFilled = variant === 'filled' && !selected;
  const textColor = isFilled ? colors.onPrimary : selected ? colors.primaryText : colors.text;
  const iconColor = isFilled ? colors.onPrimary : selected ? colors.primaryText : colors.textMuted;
  const slop = size === 'sm' ? 8 : 4;
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
        isFilled ? styles.filled : selected ? styles.selected : styles.outline,
        pressed ? styles.pressed : null,
        style,
      ]}
    >
      {leftIcon ? (
        <Feather name={leftIcon} size={size === 'sm' ? 14 : 16} color={iconColor} />
      ) : null}
      <AppText
        variant={size === 'sm' ? 'caption' : 'label'}
        family="bodyMedium"
        style={{ color: textColor }}
        numberOfLines={1}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  base: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  small: { minHeight: 32, paddingHorizontal: spacing.md, gap: spacing.xs },
  outline: { backgroundColor: t.colors.transparent, borderColor: t.colors.border },
  selected: { backgroundColor: t.colors.primarySoft, borderColor: t.colors.primaryText },
  filled: { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
  pressed: { opacity: 0.7 },
}));

export const Chip = memo(ChipBase);
