import Feather from '@expo/vector-icons/Feather';
import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import type { FeatherIconName } from '@/components/ui/icons';
import { layout, makeStyles, spacing, useTheme } from '@/theme';

export type NavRowProps = {
  icon: FeatherIconName;
  label: string;
  /** Secondary line under the label. */
  hint?: string;
  onPress: () => void;
  testID?: string;
};

/** A settings row that opens another screen: icon, label (+ hint) and a chevron. */
function NavRowBase({ icon, label, hint, onPress, testID }: NavRowProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={hint ? `${label}. ${hint}` : label}
      testID={testID}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
    >
      <Feather name={icon} size={20} color={colors.primaryText} />
      <View style={styles.text}>
        <AppText variant="body" family="bodyMedium">
          {label}
        </AppText>
        {hint ? <AppText variant="caption">{hint}</AppText> : null}
      </View>
      <Feather
        name="chevron-right"
        size={20}
        color={colors.textMuted}
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
    paddingVertical: spacing.sm,
  },
  pressed: { backgroundColor: t.colors.surfaceAlt },
  text: { flex: 1, gap: spacing.xxs },
}));

export const NavRow = memo(NavRowBase);
