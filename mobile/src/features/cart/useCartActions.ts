import { router } from 'expo-router';
import { useCallback } from 'react';

import { useToast } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { getErrorMessage } from '@/lib/appError';
import type { CourseSummary } from '@/types/api';
import { confirmAction } from '@/utils/confirmAction';

import { useRemoveFromCart } from './hooks';

/**
 * Actions shared by the phone and the PC cart: open a course, remove it (after a confirmation,
 * with an error toast), go to Checkout, or leave an empty cart for Search. All callbacks are
 * stable. `removingId` is the course whose DELETE request is in flight (or `null`).
 */
export function useCartActions() {
  const { t } = useTranslation(['cart', 'common']);
  const toast = useToast();
  const { mutate: removeFromCart, isPending, variables } = useRemoveFromCart();
  const removingId = isPending ? variables : null;

  const handleOpenCourse = useCallback((course: Pick<CourseSummary, 'id'>) => {
    router.push(`/course/${course.id}`);
  }, []);

  const handleRemove = useCallback(
    async (course: Pick<CourseSummary, 'id' | 'title'>) => {
      const isConfirmed = await confirmAction({
        title: t('cart:remove.title'),
        message: t('cart:remove.message', { title: course.title }),
        confirmLabel: t('cart:remove.confirm'),
        cancelLabel: t('common:actions.cancel'),
        isDestructive: true,
      });
      if (isConfirmed) {
        removeFromCart(course.id, { onError: (e) => toast.error(getErrorMessage(e)) });
      }
    },
    [removeFromCart, t, toast],
  );

  const handleExplore = useCallback(() => router.dismissTo('/search'), []);
  const handleCheckout = useCallback(() => router.push('/checkout'), []);

  return { removingId, handleOpenCourse, handleRemove, handleExplore, handleCheckout };
}
