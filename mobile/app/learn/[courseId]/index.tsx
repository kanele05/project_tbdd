import { useLocalSearchParams } from 'expo-router';

import { LearningScreen } from '@/features/learning/screens/LearningScreen';

export default function LearningRoute() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  return <LearningScreen courseId={courseId} />;
}
