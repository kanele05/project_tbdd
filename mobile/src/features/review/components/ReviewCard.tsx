import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { StarRating } from '@/components/ui/StarRating';
import { makeStyles, radius, spacing } from '@/theme';
import type { ReviewDto } from '@/types/api';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

export type ReviewCardProps = {
  review: ReviewDto;
  /** Teacher profile Review tab shows which course the review belongs to. */
  showCourseTitle?: boolean;
};

const AVATAR_SIZE = 40;
const STAR_SIZE = 14;
const MAX_CONTENT_LINES = 3;

/**
 * One review (SC-09 Review tab, SC-10, SC-18 Teacher profile): avatar, name, "A day ago" and the
 * gold stars on a `surfaceAlt` card with a hairline; the text is clamped to 3 lines.
 */
function ReviewCardBase({ review, showCourseTitle = false }: ReviewCardProps) {
  const themed = useStyles();
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
}));

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  author: { flex: 1, gap: spacing.xxs },
});

export const ReviewCard = memo(ReviewCardBase);
