import { memo } from 'react';

import { AppText } from '@/components/ui';
import type { ReviewDto } from '@/types/api';

export type ReviewCardProps = {
  review: ReviewDto;
  /** Teacher profile Review tab shows which course the review belongs to. */
  showCourseTitle?: boolean;
};

/**
 * Contract stub — owner C (M-15a). Also used by SC-18 Teacher Profile (owner A).
 * Replace the body; keep the exported name and props.
 */
export const ReviewCard = memo(function ReviewCard({ review }: ReviewCardProps) {
  return <AppText variant="body">{review.content}</AppText>;
});
