import Feather from '@expo/vector-icons/Feather';
import { memo } from 'react';
import { Pressable } from 'react-native';

import { useHover } from '@/components/layout/useHover';
import { pointerStyle } from '@/components/layout/work/workStyles';
import { AppText } from '@/components/ui/AppText';
import { layout, makeStyles, spacing, useTheme } from '@/theme';

export type OptionRowProps = {
  label: string;
  /** Secondary line under the label (e.g. the native name of a language). */
  hint?: string;
  isSelected: boolean;
  onPress: () => void;
  testID?: string;
};

/** One choice of a single-choice group (language, appearance): label on the left, check on the right. */
function OptionRowBase({ label, hint, isSelected, onPress, testID }: OptionRowProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { isHovered, hoverProps } = useHover();
  return (
    <Pressable
      {...hoverProps}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected: isSelected, checked: isSelected }}
      testID={testID}
      style={({ pressed }) => [styles.row, pressed || isHovered ? styles.pressed : null]}
    >
      <AppText variant="body" family={isSelected ? 'bodySemiBold' : 'body'} style={styles.label}>
        {label}
      </AppText>
      {hint ? (
        <AppText variant="caption" numberOfLines={1}>
          {hint}
        </AppText>
      ) : null}
      <Feather
        name="check"
        size={20}
        color={isSelected ? colors.primaryText : colors.transparent}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    minHeight: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    ...pointerStyle,
  },
  pressed: { backgroundColor: t.colors.surfaceAlt },
  label: { flex: 1 },
}));

export const OptionRow = memo(OptionRowBase);
