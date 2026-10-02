import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { StarRating } from '@/components/ui/StarRating';
import { colors, radius, spacing } from '@/theme';
import type { ReviewDto } from '@/types/api';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

export type ReviewCardProps = {
  review: ReviewDto;
  /** Teacher profile Review tab shows which course the review belongs to. */
  showCourseTitle?: boolean;
};

const AVATAR_SIZE = 36;
const MAX_CONTENT_LINES = 3;

/**
 * One review (SC-09 Review tab, SC-10, SC-18 Teacher profile): avatar, name, "A day ago", the
 * stars on the right and the text (max 3 lines) on a `backgroundAlt` card.
 */
function ReviewCardBase({ review, showCourseTitle = false }: ReviewCardProps) {
  const courseTitle = showCourseTitle ? review.course?.title : undefined;
  return (
    <View style={styles.card} testID={`review-${review.id}`}>
      <View style={styles.header}>
        <Avatar uri={review.user.avatarUrl} name={review.user.fullName} size={AVATAR_SIZE} />
        <View style={styles.author}>
          <AppText variant="cardTitle" numberOfLines={1}>
            {review.user.fullName}
          </AppText>
          <AppText variant="caption" family="bodyMedium">
            {formatRelativeTime(review.createdAt)}
          </AppText>
        </View>
        <StarRating value={review.rating} size={16} />
      </View>
      {courseTitle ? (
        <AppText variant="caption" color="primary" family="bodyMedium" numberOfLines={1}>
          {courseTitle}
        </AppText>
      ) : null}
      <AppText variant="body" numberOfLines={MAX_CONTENT_LINES}>
        {review.content}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.card,
    backgroundColor: colors.backgroundAlt,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  author: { flex: 1, gap: spacing.xxs },
});

export const ReviewCard = memo(ReviewCardBase);
