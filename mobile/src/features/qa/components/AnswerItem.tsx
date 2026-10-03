import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { colors, radius, spacing } from '@/theme';
import type { AnswerDto } from '@/types/api';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

export type AnswerItemProps = { answer: AnswerDto };

/** One reply of SC-16: avatar, name, time and the text on a `backgroundAlt` block (same type sizes as the review card). */
function AnswerItemBase({ answer }: AnswerItemProps) {
  return (
    <View style={styles.item} testID={`answer-${answer.id}`}>
      <View style={styles.header}>
        <Avatar uri={answer.user.avatarUrl} name={answer.user.fullName} size={36} />
        <View style={styles.author}>
          <AppText variant="caption" family="heading" numberOfLines={1}>
            {answer.user.fullName}
          </AppText>
          <AppText variant="caption" color="textSecondary">
            {formatRelativeTime(answer.createdAt)}
          </AppText>
        </View>
      </View>
      <AppText variant="caption" color="textPrimary" style={styles.content}>
        {answer.content}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    gap: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.badge,
    backgroundColor: colors.backgroundAlt,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  author: { flex: 1, gap: spacing.xs },
  content: { lineHeight: 20 },
});

export const AnswerItem = memo(AnswerItemBase);
