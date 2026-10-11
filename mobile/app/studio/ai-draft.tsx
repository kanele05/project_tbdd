import { useLocalSearchParams } from 'expo-router';

import { TeacherOnly } from '@/features/studio/components/TeacherOnly';
import { AiDraftScreen } from '@/features/studio/screens/AiDraftScreen';

export default function StudioAiDraftRoute() {
  const { courseId, topic, scope } = useLocalSearchParams<{
    courseId?: string;
    topic?: string;
    scope?: string;
  }>();
  return (
    <TeacherOnly>
      <AiDraftScreen
        courseId={courseId ?? ''}
        topic={topic}
        scope={scope === 'text' ? 'text' : 'all'}
      />
    </TeacherOnly>
  );
}
