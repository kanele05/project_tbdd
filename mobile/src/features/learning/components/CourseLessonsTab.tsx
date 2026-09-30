import { AppText } from '@/components/ui';

export type CourseLessonsTabProps = {
  courseId: string;
  /** Tap on a preview lesson while not enrolled → parent plays the preview video. */
  onPlayPreview?: (lessonId: string) => void;
};

/**
 * Contract stub — owner C (M-14/M-14b). Used by SC-09 Course Details (owner B).
 * Replace the body; keep the exported name and props.
 */
export function CourseLessonsTab({ courseId }: CourseLessonsTabProps) {
  return <AppText variant="body">{`Lessons of course ${courseId}`}</AppText>;
}
