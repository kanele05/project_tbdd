import { useLocalSearchParams } from 'expo-router';

import { SubmitProjectScreen } from '@/features/project/screens/SubmitProjectScreen';

export default function SubmitProjectRoute() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  return <SubmitProjectScreen courseId={courseId} />;
}
