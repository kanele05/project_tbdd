import { useLocalSearchParams } from 'expo-router';

import { CourseDetailScreen } from '@/features/course/screens/CourseDetailScreen';

export default function CourseDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CourseDetailScreen courseId={id} />;
}
