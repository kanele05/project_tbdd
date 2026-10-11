import Feather from '@expo/vector-icons/Feather';
import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

export type PendingCardProps = {
  total: number;
  courses: number;
  revisions: number;
  onPress: () => void;
};

/** Headline card of the dashboard: how many submissions wait for a decision; taps through to the queue. */
function PendingCardBase({ total, courses, revisions, onPress }: PendingCardProps) {
  const { t } = useTranslation('admin');
  const { colors } = useTheme();
  const styles = useStyles();
  const summary =
    total > 0
      ? t('dashboard.pendingBreakdown', { courses, revisions })
      : t('dashboard.pendingNone');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${t('dashboard.pendingTitle')}: ${total}. ${summary}`}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
      testID="pending-card"
    >
      <View style={[styles.count, total > 0 ? styles.countActive : null]}>
        <AppText variant="h1" color={total > 0 ? 'onGold' : 'text'}>
          {total}
        </AppText>
      </View>
      <View style={styles.body}>
        <AppText variant="title">{t('dashboard.pendingTitle')}</AppText>
        <AppText variant="caption" color="textSecondary">
          {summary}
        </AppText>
        {total > 0 ? (
          <AppText variant="label" color="primaryText">
            {t('dashboard.reviewNow')}
          </AppText>
        ) : null}
      </View>
      <Feather name="chevron-right" size={22} color={colors.iconMuted} />
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    minHeight: 48,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.primaryText,
    backgroundColor: t.colors.card,
  },
  pressed: { backgroundColor: t.colors.surfaceAlt },
  count: {
    minWidth: 64,
    height: 64,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.surface,
  },
  countActive: { backgroundColor: t.colors.gold },
  body: { flex: 1, gap: spacing.xxs },
}));

export const PendingCard = memo(PendingCardBase);
