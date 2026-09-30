import { memo } from 'react';

import { AppText } from '@/components/ui';
import type { TeacherSummary } from '@/types/api';

export type TeacherCardProps = {
  teacher: TeacherSummary;
  onPress: () => void;
};

/**
 * Contract stub — owner A (M-04b). Used by SC-04 Home (owner B) and SC-19.
 * Replace the body; keep the exported name and props.
 */
export const TeacherCard = memo(function TeacherCard({ teacher }: TeacherCardProps) {
  return <AppText variant="body">{teacher.fullName}</AppText>;
});
