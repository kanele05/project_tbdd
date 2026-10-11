import { useCallback, useState, type ReactElement } from 'react';

import { showToast } from '@/components/ui/Toast';
import { ReviewReplySheet } from '@/features/teaching/components/ReviewReplySheet';
import { useCourseTeacherInfo, useDeleteReviewReply } from '@/features/teaching/hooks';
import { i18n } from '@/i18n';
import type { ReviewDto } from '@/types/api';
import { confirmAction } from '@/utils/confirmAction';

export type ReviewReplyControls = {
  /** Teacher name for the reply block (undefined until the course is loaded). */
  instructorName: string | undefined;
  /** The signed-in user teaches this course. */
  canReply: boolean;
  onReply: (review: ReviewDto) => void;
  onDeleteReply: (review: ReviewDto) => void;
  /** Render once per screen: the reply sheet (closed until `onReply`). */
  sheet: ReactElement | null;
};

/**
 * Teacher actions on the reviews of `courseId` (BR-25): open the reply sheet, delete a reply after a
 * confirmation. For anyone who is not the course teacher `canReply` is false and `sheet` is null.
 */
export function useReviewReply(courseId: string): ReviewReplyControls {
  const { teacherName, isOwner } = useCourseTeacherInfo(courseId);
  const [target, setTarget] = useState<ReviewDto | null>(null);
  const { mutate: deleteReply } = useDeleteReviewReply();

  const handleClose = useCallback(() => setTarget(null), []);
  const handleDelete = useCallback(
    async (review: ReviewDto) => {
      const isConfirmed = await confirmAction({
        title: i18n.t('review:reply.deleteTitle'),
        message: i18n.t('review:reply.deleteMessage'),
        confirmLabel: i18n.t('review:reply.delete'),
        cancelLabel: i18n.t('common:actions.cancel'),
        isDestructive: true,
      });
      if (!isConfirmed) return;
      deleteReply(review.id, {
        onSuccess: () => showToast(i18n.t('review:reply.deleted'), { type: 'success' }),
      });
    },
    [deleteReply],
  );
  const onDeleteReply = useCallback(
    (review: ReviewDto) => void handleDelete(review),
    [handleDelete],
  );

  return {
    instructorName: teacherName,
    canReply: isOwner,
    onReply: setTarget,
    onDeleteReply,
    sheet: isOwner ? <ReviewReplySheet review={target} onClose={handleClose} /> : null,
  };
}
