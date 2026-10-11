import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StarRating } from '@/components/ui/StarRating';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing } from '@/theme';
import type { ReviewDto } from '@/types/api';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

export type ReviewCardProps = {
  review: ReviewDto;
  /** Teacher profile Review tab shows which course the review belongs to. */
  showCourseTitle?: boolean;
  /** Name shown on the instructor reply (the course's teacher), when the screen knows it. */
  instructorName?: string;
  /** The signed-in user teaches this course: show Reply / Edit / Delete reply (BR-25). Keep the callbacks stable. */
  canReply?: boolean;
  onReply?: (review: ReviewDto) => void;
  onDeleteReply?: (review: ReviewDto) => void;
};

const AVATAR_SIZE = 40;
const STAR_SIZE = 14;
const MAX_CONTENT_LINES = 3;

/**
 * One review (SC-09 Review tab, SC-10, SC-18 Teacher profile): avatar, name, "A day ago" and the
 * gold stars on a `surfaceAlt` card with a hairline; the text is clamped to 3 lines.
 */
function ReviewCardBase({
  review,
  showCourseTitle = false,
  instructorName,
  canReply = false,
  onReply,
  onDeleteReply,
}: ReviewCardProps) {
  const { t } = useTranslation(['review', 'teaching']);
  const themed = useStyles();
  const reply = review.teacherReply;
  const courseTitle = showCourseTitle ? review.course?.title : undefined;
  return (
    <View style={themed.card} testID={`review-${review.id}`}>
      <View style={styles.header}>
        <Avatar uri={review.user.avatarUrl} name={review.user.fullName} size={AVATAR_SIZE} />
        <View style={styles.author}>
          <AppText variant="label" numberOfLines={1}>
            {review.user.fullName}
          </AppText>
          <AppText variant="caption">{formatRelativeTime(review.createdAt)}</AppText>
        </View>
        <StarRating value={review.rating} size={STAR_SIZE} />
      </View>
      {courseTitle ? (
        <AppText variant="caption" color="primaryText" family="bodySemiBold" numberOfLines={1}>
          {courseTitle}
        </AppText>
      ) : null}
      <AppText variant="body" color="textSecondary" numberOfLines={MAX_CONTENT_LINES}>
        {review.content}
      </AppText>
      {reply ? (
        <View
          style={themed.reply}
          accessible
          accessibilityLabel={`${t('review:reply.by', { name: instructorName ?? t('teaching:instructor') })}. ${reply}`}
          testID={`review-reply-${review.id}`}
        >
          <View style={styles.replyHeader}>
            {instructorName ? (
              <AppText variant="label" numberOfLines={1} style={styles.replyName}>
                {instructorName}
              </AppText>
            ) : null}
            <Badge label={t('teaching:instructor')} tone="secondary" shape="pill" />
            {review.teacherRepliedAt ? (
              <AppText variant="caption">{formatRelativeTime(review.teacherRepliedAt)}</AppText>
            ) : null}
          </View>
          <AppText variant="body" color="textSecondary">
            {reply}
          </AppText>
        </View>
      ) : null}
      {canReply && onReply ? (
        <View style={styles.actions}>
          <Button
            title={reply ? t('review:reply.edit') : t('review:reply.action')}
            accessibilityLabel={t(reply ? 'review:reply.editA11y' : 'review:reply.actionA11y', {
              name: review.user.fullName,
            })}
            variant="ghost"
            size="sm"
            leftIcon="corner-down-right"
            onPress={() => onReply(review)}
            testID={`reply-${review.id}`}
          />
          {reply && onDeleteReply ? (
            <Button
              title={t('review:reply.delete')}
              accessibilityLabel={t('review:reply.deleteA11y', { name: review.user.fullName })}
              variant="ghost"
              size="sm"
              leftIcon="trash-2"
              onPress={() => onDeleteReply(review)}
              testID={`delete-reply-${review.id}`}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.surfaceAlt,
  },
  reply: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.button,
    borderLeftWidth: 3,
    borderLeftColor: t.colors.secondary,
    backgroundColor: t.colors.card,
  },
}));

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  author: { flex: 1, gap: spacing.xxs },
  replyHeader: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  replyName: { flexShrink: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});

export const ReviewCard = memo(ReviewCardBase);
