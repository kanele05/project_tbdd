import { router } from 'expo-router';
import { useCallback, useState } from 'react';

import { showToast } from '@/components/ui/Toast';
import { useTranslation } from '@/i18n';
import type { AdminCourseDetailDto } from '@/types/api';
import { confirmAction } from '@/utils/confirmAction';

import { getAdminErrorMessage } from './adminErrors';
import { useApproveCourse, useArchiveCourse, useRejectCourse, useRestoreCourse } from './hooks';

function leaveScreen(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/**
 * Decision flow of SC-33: confirmations, the reject / archive reason dialogs, success toasts and
 * error handling. Approve and Reject leave the screen (the item left the queue); Archive and
 * Restore stay so the reviewer sees the new state.
 */
export function useModerationFlow(courseId: string, detail: AdminCourseDetailDto | undefined) {
  const { t } = useTranslation('admin');
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const approve = useApproveCourse(courseId);
  const reject = useRejectCourse(courseId);
  const archive = useArchiveCourse(courseId);
  const restore = useRestoreCourse(courseId);
  const isRevision = detail?.reviewTarget === 'REVISION';

  const handleApprove = useCallback(async () => {
    const isConfirmed = await confirmAction({
      title: t(isRevision ? 'confirm.approveRevisionTitle' : 'confirm.approveCourseTitle'),
      message: t(isRevision ? 'confirm.approveRevisionMessage' : 'confirm.approveCourseMessage'),
      confirmLabel: t('actions.approve'),
      cancelLabel: t('actions.cancel'),
    });
    if (!isConfirmed) return;
    approve.mutate(undefined, {
      onSuccess: () => {
        showToast(t(isRevision ? 'toast.revisionApproved' : 'toast.courseApproved'), {
          type: 'success',
        });
        leaveScreen();
      },
      onError: (error) => showToast(getAdminErrorMessage(error), { type: 'error' }),
    });
  }, [approve, isRevision, t]);

  const handleRestore = useCallback(async () => {
    const isConfirmed = await confirmAction({
      title: t('confirm.restoreTitle'),
      message: t('confirm.restoreMessage'),
      confirmLabel: t('actions.restore'),
      cancelLabel: t('actions.cancel'),
    });
    if (!isConfirmed) return;
    restore.mutate(
      {},
      {
        onSuccess: () => showToast(t('toast.restored'), { type: 'success' }),
        onError: (error) => showToast(getAdminErrorMessage(error), { type: 'error' }),
      },
    );
  }, [restore, t]);

  const submitReject = useCallback(
    (reason: string) =>
      reject.mutate(
        { reason },
        {
          onSuccess: () => {
            setIsRejectOpen(false);
            showToast(t(isRevision ? 'toast.revisionRejected' : 'toast.courseRejected'), {
              type: 'success',
            });
            leaveScreen();
          },
        },
      ),
    [reject, isRevision, t],
  );

  const submitArchive = useCallback(
    (reason: string) =>
      archive.mutate(reason ? { reason } : {}, {
        onSuccess: () => {
          setIsArchiveOpen(false);
          showToast(t('toast.archived'), { type: 'success' });
        },
      }),
    [archive, t],
  );

  const openReject = useCallback(() => {
    reject.reset();
    setIsRejectOpen(true);
  }, [reject]);
  const openArchive = useCallback(() => {
    archive.reset();
    setIsArchiveOpen(true);
  }, [archive]);

  return {
    isRevision,
    approve: { run: handleApprove, isPending: approve.isPending },
    restore: { run: handleRestore, isPending: restore.isPending },
    reject: {
      isOpen: isRejectOpen,
      isPending: reject.isPending,
      errorMessage: reject.error ? getAdminErrorMessage(reject.error) : null,
      open: openReject,
      close: () => setIsRejectOpen(false),
      submit: submitReject,
    },
    archive: {
      isOpen: isArchiveOpen,
      isPending: archive.isPending,
      errorMessage: archive.error ? getAdminErrorMessage(archive.error) : null,
      open: openArchive,
      close: () => setIsArchiveOpen(false),
      submit: submitArchive,
    },
  };
}
