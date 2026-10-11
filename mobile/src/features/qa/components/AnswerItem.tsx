import Feather from '@expo/vector-icons/Feather';
import { memo } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';
import type { AnswerDto } from '@/types/api';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

export type AnswerItemProps = {
  answer: AnswerDto;
  /** The signed-in user teaches this course: show Pin / Unpin (BR-24). Keep `onTogglePin` stable. */
  canPin?: boolean;
  onTogglePin?: (answer: AnswerDto) => void;
};

/**
 * One reply of SC-16: avatar, name, time and the text on a `surfaceAlt` block. A reply by the
 * course teacher carries the "Instructor" badge; the pinned one shows a pin mark and the teacher
 * gets a Pin / Unpin button.
 */
function AnswerItemBase({ answer, canPin = false, onTogglePin }: AnswerItemProps) {
  const { t } = useTranslation(['qa', 'teaching']);
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View
      style={[styles.item, answer.isPinned ? styles.pinned : null]}
      testID={`answer-${answer.id}`}
    >
      {answer.isPinned ? (
        <View style={styles.pinRow} testID={`answer-pinned-${answer.id}`}>
          <Feather name="bookmark" size={14} color={colors.primaryText} />
          <AppText variant="micro" color="primaryText">
            {t('qa:pin.pinned')}
          </AppText>
        </View>
      ) : null}
      <View style={styles.header}>
        <Avatar uri={answer.user.avatarUrl} name={answer.user.fullName} size={36} />
        <View style={styles.author}>
          <View style={styles.nameRow}>
            <AppText variant="label" numberOfLines={1} style={styles.name}>
              {answer.user.fullName}
            </AppText>
            {answer.isInstructor ? (
              <Badge label={t('teaching:instructor')} tone="secondary" shape="pill" />
            ) : null}
          </View>
          <AppText variant="caption">{formatRelativeTime(answer.createdAt)}</AppText>
        </View>
      </View>
      <AppText variant="body" color="textSecondary">
        {answer.content}
      </AppText>
      {canPin && onTogglePin ? (
        <Button
          title={answer.isPinned ? t('qa:pin.unpin') : t('qa:pin.pin')}
          accessibilityLabel={answer.isPinned ? t('qa:pin.unpinA11y') : t('qa:pin.pinA11y')}
          variant="ghost"
          size="sm"
          leftIcon="bookmark"
          onPress={() => onTogglePin(answer)}
          testID={`pin-${answer.id}`}
        />
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  item: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.surfaceAlt,
  },
  pinned: { borderColor: t.colors.primaryText },
  pinRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  author: { flex: 1, gap: spacing.xxs },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flexShrink: 1 },
}));

export const AnswerItem = memo(AnswerItemBase);
