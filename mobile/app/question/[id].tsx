import { useLocalSearchParams } from 'expo-router';

import { QuestionDetailScreen } from '@/features/qa/screens/QuestionDetailScreen';

export default function QuestionDetailRoute() {
  const { id, courseId } = useLocalSearchParams<{ id: string; courseId?: string }>();
  return <QuestionDetailScreen questionId={id} courseId={courseId} />;
}
