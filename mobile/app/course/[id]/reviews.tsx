import { useLocalSearchParams } from 'expo-router';

import { AllReviewsScreen } from '@/features/review/screens/AllReviewsScreen';

export default function AllReviewsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AllReviewsScreen courseId={id} />;
}
