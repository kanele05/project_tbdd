import { useLocalSearchParams } from 'expo-router';

import { TeacherOnly } from '@/features/studio/components/TeacherOnly';
import { CourseWizardScreen } from '@/features/studio/screens/CourseWizardScreen';

/**
 * Course wizard: `/studio/new/edit` creates a course, `/studio/<id>/edit` edits one.
 * `?step=idea|intro|price|lessons|review` opens a given step.
 */
export default function StudioCourseEditRoute() {
  const { id, step } = useLocalSearchParams<{ id: string; step?: string }>();
  return (
    <TeacherOnly>
      <CourseWizardScreen courseId={id} step={step} />
    </TeacherOnly>
  );
}
