import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useToast } from '@/components/ui/Toast';
import { getErrorMessage, isAppError } from '@/lib/appError';

/** `true` for the 403 `NOT_ENROLLED` answer of lessons / Q&A (BR-01, BR-09, NFR-06). */
export function isNotEnrolledError(error: unknown): boolean {
  return isAppError(error) && error.code === 'NOT_ENROLLED';
}

/**
 * Runs `onBlocked` once (and shows the "enroll to unlock" toast) as soon as one of `errors` is a
 * 403 `NOT_ENROLLED`. Used by every screen that needs an enrollment.
 */
export function useNotEnrolledGuard(errors: readonly unknown[], onBlocked: () => void): void {
  const toast = useToast();
  const handledRef = useRef(false);
  const blockingError = errors.find(isNotEnrolledError);
  const onBlockedRef = useRef(onBlocked);

  useEffect(() => {
    onBlockedRef.current = onBlocked;
  });

  useEffect(() => {
    if (!blockingError || handledRef.current) return;
    handledRef.current = true;
    toast.info(getErrorMessage(blockingError));
    onBlockedRef.current();
  }, [blockingError, toast]);
}

/** Learning screen variant: a blocked user goes back to the course details (SC-09). */
export function useCourseAccessGuard(courseId: string, errors: readonly unknown[]): void {
  useNotEnrolledGuard(errors, () => {
    router.replace({ pathname: '/course/[id]', params: { id: courseId } });
  });
}
