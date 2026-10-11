import Feather from '@expo/vector-icons/Feather';
import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import type { FeatherIconName } from '@/components/ui/icons';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

export type QuickLinkProps = {
  icon: FeatherIconName;
  title: string;
  subtitle?: string;
  onPress: () => void;
  testID?: string;
};

/** Full-width navigation row (icon, title, chevron) used for the dashboard shortcuts. */
function QuickLinkBase({ icon, title, subtitle, onPress, testID }: QuickLinkProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
      testID={testID}
    >
      <View style={styles.iconWrap}>
        <Feather name={icon} size={20} color={colors.primaryText} />
      </View>
      <View style={styles.body}>
        <AppText variant="title">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" color="textSecondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <Feather name="chevron-right" size={22} color={colors.iconMuted} />
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
  },
  pressed: { backgroundColor: t.colors.surfaceAlt },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.primarySoft,
  },
  body: { flex: 1 },
}));

export const QuickLink = memo(QuickLinkBase);
