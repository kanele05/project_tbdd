import { memo, useCallback } from 'react';
import type { DimensionValue } from 'react-native';

import { CourseCardDesktop } from '@/components/course';
import type { MyCourseItem } from '@/types/api';

export type OwnedCourseCardProps = {
  item: MyCourseItem;
  /** Keep stable (`useCallback`): opens the lesson the student left off at. */
  onOpen: (item: MyCourseItem) => void;
  width?: DimensionValue;
};

/**
 * A course the student owns, as a desktop hover card: progress line under the photo, "NN % done"
 * and a play button on hover. Clicking the card or the button resumes learning.
 */
function OwnedCourseCardBase({ item, onOpen, width }: OwnedCourseCardProps) {
  const handleOpen = useCallback(() => onOpen(item), [item, onOpen]);
  return (
    <CourseCardDesktop
      course={item.course}
      width={width}
      progressPercent={item.progressPercent}
      onPress={handleOpen}
      onPlay={handleOpen}
      testID={`my-course-${item.course.id}`}
    />
  );
}

export const OwnedCourseCard = memo(OwnedCourseCardBase);
