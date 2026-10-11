import { useLocalSearchParams } from 'expo-router';

import { TeacherOnly } from '@/features/studio/components/TeacherOnly';
import { CourseStatusScreen } from '@/features/studio/screens/CourseStatusScreen';

export default function StudioCourseStatusRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <TeacherOnly>
      <CourseStatusScreen courseId={id} />
    </TeacherOnly>
  );
}
