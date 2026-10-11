import Feather from '@expo/vector-icons/Feather';
import { memo } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';
import type { CourseMissingItemDto } from '@/types/api';

export type MissingNoticeProps = { items: readonly CourseMissingItemDto[] };

/** Unmet submit requirements (BR-20) of the content under review: approving would fail with `COURSE_INCOMPLETE`. */
function MissingNoticeBase({ items }: MissingNoticeProps) {
  const { t } = useTranslation('admin');
  const { colors } = useTheme();
  const styles = useStyles();
  if (items.length === 0) return null;
  return (
    <View style={styles.card} accessibilityRole="alert" testID="missing-notice">
      <View style={styles.head}>
        <Feather name="alert-triangle" size={20} color={colors.dangerText} />
        <AppText variant="label" color="dangerText">
          {t('missing.title')}
        </AppText>
      </View>
      <AppText variant="caption" color="textSecondary">
        {t('missing.hint')}
      </AppText>
      {items.map((item, index) => (
        <AppText key={`${item.code}-${item.lessonNumber ?? index}`} variant="body">
          • {t(`missing.codes.${item.code}`)}
          {item.lessonNumber
            ? ` (${t('missing.lessonNumber', { number: item.lessonNumber })})`
            : ''}
        </AppText>
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.dangerText,
    backgroundColor: t.colors.card,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
}));

export const MissingNotice = memo(MissingNoticeBase);
