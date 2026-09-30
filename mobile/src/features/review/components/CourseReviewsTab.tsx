import { AppText } from '@/components/ui';

export type CourseReviewsTabProps = {
  courseId: string;
  /** True when the current user is enrolled → show "Write a review" (SC-11). */
  canWriteReview: boolean;
};

/**
 * Contract stub — owner C (M-15a). Used by SC-09 Course Details (owner B).
 * Replace the body; keep the exported name and props.
 */
export function CourseReviewsTab({ courseId }: CourseReviewsTabProps) {
  return <AppText variant="body">{`Reviews of course ${courseId}`}</AppText>;
}
