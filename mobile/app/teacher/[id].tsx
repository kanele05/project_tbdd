import { useLocalSearchParams } from 'expo-router';

import { TeacherProfileScreen } from '@/features/teacher/screens/TeacherProfileScreen';

export default function TeacherProfileRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TeacherProfileScreen teacherId={id} />;
}
