import { useLocalSearchParams } from 'expo-router';

import { TeacherOnly } from '@/features/studio/components/TeacherOnly';
import { CourseEditScreen } from '@/features/studio/screens/CourseEditScreen';

/** `/studio/new/edit` creates a course, `/studio/<id>/edit` edits one. */
export default function StudioCourseEditRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <TeacherOnly>
      <CourseEditScreen courseId={id} />
    </TeacherOnly>
  );
}
