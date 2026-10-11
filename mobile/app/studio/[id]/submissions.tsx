import { useLocalSearchParams } from 'expo-router';

import { TeacherSubmissionsScreen } from '@/features/teaching/screens/TeacherSubmissionsScreen';

export default function TeacherSubmissionsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TeacherSubmissionsScreen courseId={id} />;
}
