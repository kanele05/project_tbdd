import { router } from 'expo-router';
import { useCallback, useState } from 'react';

import { showToast } from '@/components/ui/Toast';
import { i18n, tr } from '@/i18n';
import { getErrorMessage, toAppError } from '@/lib/appError';
import type { CourseMissingItemDto, StudioCourseDetailDto } from '@/types/api';
import { confirmAction } from '@/utils/confirmAction';

import {
  useCourseWorkflow,
  useDeleteCourse,
  useDiscardRevision,
  type CourseWorkflowAction,
} from './hooks';
import { getMissingFromError } from './missingItems';

type Confirmation = 'withdraw' | 'archive' | 'discardRevision' | 'delete' | 'withdrawRevision';

async function confirmStep(kind: Confirmation): Promise<boolean> {
  return confirmAction({
    title: tr(`studio:confirm.${kind}.title`),
    message: tr(`studio:confirm.${kind}.message`),
    confirmLabel: tr(`studio:confirm.${kind}.confirm`),
    cancelLabel: i18n.t('studio:actions.cancel'),
    isDestructive: kind !== 'archive' && kind !== 'withdraw' && kind !== 'withdrawRevision',
  });
}

/**
 * Every button of the status screen (SC-26): submit / withdraw / archive / restore, the revision
 * create / submit / discard, and delete. Destructive ones ask first. A 422 `COURSE_INCOMPLETE`
 * keeps its `details.missing` so the checklist can show what is left; other errors become `error`.
 * Every action resolves to `true` when it went through (the wizard leaves the editor then).
 */
export function useCourseStatusActions(detail: StudioCourseDetailDto) {
  const workflow = useCourseWorkflow(detail.id);
  const discard = useDiscardRevision(detail.id);
  const remove = useDeleteCourse();
  const [error, setError] = useState<string | null>(null);
  const [missingFromError, setMissingFromError] = useState<CourseMissingItemDto[] | null>(null);

  const guarded = useCallback(
    async (task: () => Promise<void>, successKey: string): Promise<boolean> => {
      setError(null);
      try {
        await task();
        setMissingFromError(null);
        if (successKey) showToast(tr(`studio:toast.${successKey}`), { type: 'success' });
        return true;
      } catch (caught) {
        const appError = toAppError(caught);
        const missing = getMissingFromError(appError.details);
        if (appError.code === 'COURSE_INCOMPLETE' && missing.length > 0)
          setMissingFromError(missing);
        setError(getErrorMessage(caught));
        return false;
      }
    },
    [],
  );

  const run = useCallback(
    (action: CourseWorkflowAction, successKey: string, confirmation?: Confirmation) =>
      guarded(async () => {
        if (confirmation && !(await confirmStep(confirmation))) return;
        await workflow.mutateAsync(action);
      }, successKey),
    [guarded, workflow],
  );

  return {
    error,
    missingFromError,
    isBusy: workflow.isPending || discard.isPending || remove.isPending,
    submit: () => run('submit', 'submitted'),
    withdraw: () => run('withdraw', 'withdrawn', 'withdraw'),
    archive: () => run('archive', 'archived', 'archive'),
    restore: () => run('restore', 'restored'),
    createRevision: () => run('createRevision', 'revisionCreated'),
    submitRevision: () => run('submitRevision', 'revisionSubmitted'),
    discardRevision: () =>
      guarded(async () => {
        const kind =
          detail.revision?.status === 'PENDING_REVIEW' ? 'withdrawRevision' : 'discardRevision';
        if (!(await confirmStep(kind))) return;
        await discard.mutateAsync();
      }, 'revisionDiscarded'),
    deleteCourse: () =>
      guarded(async () => {
        if (!(await confirmStep('delete'))) return;
        await remove.mutateAsync(detail.id);
        router.replace('/(tabs)/studio');
      }, 'deleted'),
  };
}
