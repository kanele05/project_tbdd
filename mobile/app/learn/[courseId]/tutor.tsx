import { useLocalSearchParams } from 'expo-router';

import { AiTutorScreen } from '@/features/ai/screens/AiTutorScreen';

export default function AiTutorRoute() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  return <AiTutorScreen courseId={courseId} />;
}
