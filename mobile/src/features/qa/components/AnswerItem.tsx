import { memo } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { makeStyles, radius, spacing } from '@/theme';
import type { AnswerDto } from '@/types/api';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

export type AnswerItemProps = { answer: AnswerDto };

/** One reply of SC-16: avatar, name, time and the text on a `surfaceAlt` block. */
function AnswerItemBase({ answer }: AnswerItemProps) {
  const styles = useStyles();
  return (
    <View style={styles.item} testID={`answer-${answer.id}`}>
      <View style={styles.header}>
        <Avatar uri={answer.user.avatarUrl} name={answer.user.fullName} size={36} />
        <View style={styles.author}>
          <AppText variant="label" numberOfLines={1}>
            {answer.user.fullName}
          </AppText>
          <AppText variant="caption">{formatRelativeTime(answer.createdAt)}</AppText>
        </View>
      </View>
      <AppText variant="body" color="textSecondary">
        {answer.content}
      </AppText>
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
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  author: { flex: 1, gap: spacing.xxs },
}));

export const AnswerItem = memo(AnswerItemBase);
