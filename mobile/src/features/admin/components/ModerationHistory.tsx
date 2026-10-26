import Feather from '@expo/vector-icons/Feather';
import { memo } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';
import type { CourseModerationDto } from '@/types/api';
import { formatRelativeTime, formatRelativeTimeInline } from '@/utils/formatRelativeTime';

import { MODERATION_ICON } from '../adminMeta';

export type ModerationHistoryProps = { entries: readonly CourseModerationDto[] };

/** Moderation history of a course (newest first): who did what to the course or its revision, and why. */
function ModerationHistoryBase({ entries }: ModerationHistoryProps) {
  const { t } = useTranslation('admin');
  const { colors } = useTheme();
  const styles = useStyles();
  if (entries.length === 0) {
    return (
      <AppText variant="body" color="textSecondary">
        {t('history.empty')}
      </AppText>
    );
  }
  return (
    <View style={styles.card} testID="moderation-history">
      {entries.map((entry) => (
        <View
          key={entry.id}
          style={styles.row}
          accessible
          accessibilityLabel={t('history.itemLabel', {
            actor: entry.actor.fullName,
            action: t(`history.action.${entry.action}`),
            target: t(`history.target.${entry.target}`),
            when: formatRelativeTimeInline(entry.createdAt),
          })}
        >
          <Feather name={MODERATION_ICON[entry.action]} size={20} color={colors.primaryText} />
          <View style={styles.body}>
            <AppText variant="label">
              {t(`history.action.${entry.action}`)} · {t(`history.target.${entry.target}`)}
            </AppText>
            <AppText variant="caption" color="textSecondary">
              {entry.actor.fullName} · {formatRelativeTime(entry.createdAt)}
            </AppText>
            {entry.reason ? <AppText variant="body">{entry.reason}</AppText> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.borderSubtle,
  },
  body: { flex: 1, gap: spacing.xxs },
}));

export const ModerationHistory = memo(ModerationHistoryBase);
