import { useLocalSearchParams } from 'expo-router';

import { QuestionDetailScreen } from '@/features/qa/screens/QuestionDetailScreen';

export default function QuestionDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <QuestionDetailScreen questionId={id} />;
}
