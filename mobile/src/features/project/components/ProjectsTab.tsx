import { AppText } from '@/components/ui';

export type ProjectsTabProps = {
  courseId: string;
};

/**
 * Contract stub — owner B (M-21). Used by SC-15 Learning (owner C).
 * Replace the body; keep the exported name and props.
 */
export function ProjectsTab({ courseId }: ProjectsTabProps) {
  return <AppText variant="body">{`Projects of course ${courseId}`}</AppText>;
}
