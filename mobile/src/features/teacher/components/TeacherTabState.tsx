import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';

import { TeacherCoursesSkeleton, TeacherReviewsSkeleton } from './TeacherSkeletons';

export type TeacherTabStateProps = {
  tab: 'courses' | 'review';
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
};

/** What the Courses / Review tab shows instead of rows: skeleton, error with Retry, or empty. */
export function TeacherTabState({ tab, isPending, isError, error, onRetry }: TeacherTabStateProps) {
  if (isError) return <ErrorState error={error} onRetry={onRetry} />;
  if (isPending) {
    return tab === 'courses' ? <TeacherCoursesSkeleton /> : <TeacherReviewsSkeleton />;
  }
  return tab === 'courses' ? (
    <EmptyState
      icon="book-open"
      title="No courses yet"
      message="This teacher has not published any course."
    />
  ) : (
    <EmptyState
      icon="message-square"
      title="No reviews yet"
      message="Reviews from learners will appear here."
    />
  );
}
