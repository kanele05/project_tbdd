import { useLocalSearchParams } from 'expo-router';

import { LessonQuizScreen } from '@/features/ai/screens/LessonQuizScreen';

export default function LessonQuizRoute() {
  const { courseId, lessonId } = useLocalSearchParams<{ courseId: string; lessonId?: string }>();
  return <LessonQuizScreen courseId={courseId} lessonId={lessonId ?? null} />;
}
