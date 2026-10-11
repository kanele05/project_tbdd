import { useLocalSearchParams } from 'expo-router';

import { AdminCourseDetailScreen } from '@/features/admin/screens/AdminCourseDetailScreen';

export default function AdminCourseDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AdminCourseDetailScreen courseId={id} />;
}
