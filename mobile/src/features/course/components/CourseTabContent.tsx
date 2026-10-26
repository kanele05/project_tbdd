import { CourseLessonsTab } from '@/features/learning/components/CourseLessonsTab';
import { CourseReviewsTab } from '@/features/review/components/CourseReviewsTab';
import type { CourseDetail } from '@/types/api';

import type { CourseTab } from '../useCourseTabs';
import { CourseOverviewTab } from './CourseOverviewTab';

export type CourseTabContentProps = {
  course: CourseDetail;
  tab: CourseTab;
  /** The AI summary exists only for signed-in users. */
  canUseAi: boolean;
  isAiRequested: boolean;
  onRequestAi: () => void;
  onAiLayout: (y: number) => void;
  onPlayPreview: (lessonId: string) => void;
  /** The PC body shows similar courses in its own full-width block. Default true. */
  showSimilar?: boolean;
  /** The PC purchase card lists "This course includes", so its Overview tab hides it. Default true. */
  showBenefits?: boolean;
};

/** The body of the active tab of SC-09: Overview, Lessons or Reviews. */
export function CourseTabContent({
  course,
  tab,
  canUseAi,
  isAiRequested,
  onRequestAi,
  onAiLayout,
  onPlayPreview,
  showSimilar = true,
  showBenefits = true,
}: CourseTabContentProps) {
  if (tab === 'lessons') {
    return <CourseLessonsTab courseId={course.id} onPlayPreview={onPlayPreview} />;
  }
  if (tab === 'reviews') {
    return <CourseReviewsTab courseId={course.id} canWriteReview={course.enrollment !== null} />;
  }
  return (
    <CourseOverviewTab
      course={course}
      canUseAi={canUseAi}
      isAiRequested={isAiRequested}
      onRequestAi={onRequestAi}
      onAiLayout={onAiLayout}
      showSimilar={showSimilar}
      showBenefits={showBenefits}
    />
  );
}
