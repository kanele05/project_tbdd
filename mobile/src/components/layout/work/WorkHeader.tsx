import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

import { useHover } from '../useHover';
import { pointerStyle } from './workStyles';

export type WorkHeaderProps = {
  title: string;
  subtitle?: string;
  /** Show the "Back" link above the title (detail pages). Default `false`. */
  hasBack?: boolean;
  /** Overrides the default back navigation (`router.back()`, or Home when there is no history). */
  onBack?: () => void;
  /** Actions on the right of the title row (buttons). */
  right?: ReactNode;
  testID?: string;
};

function goBack(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

function BackLink({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles();
  const { isHovered, hoverProps } = useHover();
  return (
    <Pressable
      {...hoverProps}
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={t('actions.back')}
      hitSlop={8}
      style={[styles.back, isHovered ? styles.backHover : null]}
      testID="work-header-back"
    >
      <Feather name="chevron-left" size={18} color={colors.textSecondary} />
      <AppText variant="label" color="textSecondary">
        {t('actions.back')}
      </AppText>
    </Pressable>
  );
}

/**
 * Title row of a PC work page: optional "Back" link, a big title with a one-line subtitle on the
 * left and the page actions on the right. The title wraps (long course names) instead of clipping.
 */
export function WorkHeader({
  title,
  subtitle,
  hasBack = false,
  onBack,
  right,
  testID,
}: WorkHeaderProps) {
  const styles = useStyles();
  return (
    <View style={styles.wrap} testID={testID}>
      {hasBack ? <BackLink onPress={onBack ?? goBack} /> : null}
      <View style={styles.row}>
        <View style={styles.titles}>
          <AppText variant="h1" accessibilityRole="header" numberOfLines={3}>
            {title}
          </AppText>
          {subtitle ? <AppText color="textSecondary">{subtitle}</AppText> : null}
        </View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { gap: spacing.md, marginBottom: spacing.xxl },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  titles: { flex: 1, flexBasis: 320, gap: spacing.xs, minWidth: 0 },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  back: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 32,
    paddingRight: spacing.sm,
    borderRadius: radius.pill,
    ...pointerStyle,
  },
  backHover: { backgroundColor: t.colors.surface },
}));
