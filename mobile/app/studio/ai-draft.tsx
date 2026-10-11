import { useLocalSearchParams } from 'expo-router';

import { TeacherOnly } from '@/features/studio/components/TeacherOnly';
import { AiDraftScreen } from '@/features/studio/screens/AiDraftScreen';

export default function StudioAiDraftRoute() {
  const { courseId, topic } = useLocalSearchParams<{ courseId?: string; topic?: string }>();
  return (
    <TeacherOnly>
      <AiDraftScreen courseId={courseId ?? ''} topic={topic} />
    </TeacherOnly>
  );
}
