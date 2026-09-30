import { useLocalSearchParams } from 'expo-router';

import { WriteReviewScreen } from '@/features/review/screens/WriteReviewScreen';

export default function WriteReviewRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <WriteReviewScreen courseId={id} />;
}
