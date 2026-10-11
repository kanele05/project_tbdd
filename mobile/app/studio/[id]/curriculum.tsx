import { useLocalSearchParams } from 'expo-router';

import { TeacherOnly } from '@/features/studio/components/TeacherOnly';
import { CurriculumScreen } from '@/features/studio/screens/CurriculumScreen';

export default function StudioCurriculumRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <TeacherOnly>
      <CurriculumScreen courseId={id} />
    </TeacherOnly>
  );
}
