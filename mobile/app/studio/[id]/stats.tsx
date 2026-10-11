import { useLocalSearchParams } from 'expo-router';

import { TeacherStatsScreen } from '@/features/teaching/screens/TeacherStatsScreen';

export default function TeacherStatsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TeacherStatsScreen courseId={id} />;
}
