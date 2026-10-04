import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useTranslation } from '@/i18n';

import { TeacherCoursesSkeleton, TeacherReviewsSkeleton } from './TeacherSkeletons';

export type TeacherTabStateProps = {
  tab: 'courses' | 'review';
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
};

/** What the Courses / Reviews tab shows instead of rows: skeleton, error with Retry, or empty. */
export function TeacherTabState({ tab, isPending, isError, error, onRetry }: TeacherTabStateProps) {
  const { t } = useTranslation('teacher');
  if (isError) return <ErrorState error={error} onRetry={onRetry} />;
  if (isPending) {
    return tab === 'courses' ? <TeacherCoursesSkeleton /> : <TeacherReviewsSkeleton />;
  }
  return tab === 'courses' ? (
    <EmptyState
      icon="book-open"
      title={t('empty.coursesTitle')}
      message={t('empty.coursesMessage')}
    />
  ) : (
    <EmptyState
      icon="message-square"
      title={t('empty.reviewsTitle')}
      message={t('empty.reviewsMessage')}
    />
  );
}
