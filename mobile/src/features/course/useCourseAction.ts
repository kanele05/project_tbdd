import { router } from 'expo-router';
import { useCallback } from 'react';

import { useToast } from '@/components/ui';
import { useAddToCart } from '@/features/cart/hooks';
import { useTranslation } from '@/i18n';
import { getErrorMessage } from '@/lib/appError';

import type { CourseAction } from './courseAction';
import { useEnrollFree } from './hooks';

/**
 * Runs the BR-17 action of the bottom bar for one course:
 * Continue learning / Go to cart navigate; Add to cart and Enroll for free call the API first.
 */
export function useCourseAction(courseId: string) {
  const { t } = useTranslation('course');
  const toast = useToast();
  const addToCart = useAddToCart();
  const enroll = useEnrollFree();
  const { mutateAsync: addToCartAsync } = addToCart;
  const { mutateAsync: enrollAsync } = enroll;

  const perform = useCallback(
    async (action: CourseAction) => {
      try {
        switch (action) {
          case 'CONTINUE':
            router.push(`/learn/${courseId}`);
            break;
          case 'GO_TO_CART':
            router.push('/cart');
            break;
          case 'ADD_TO_CART':
            await addToCartAsync(courseId);
            toast.success(t('toast.addedToCart'), {
              actionLabel: t('toast.viewCart'),
              onAction: () => router.push('/cart'),
            });
            break;
          case 'ENROLL_FREE':
            await enrollAsync(courseId);
            router.push(`/learn/${courseId}`);
            break;
        }
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [addToCartAsync, courseId, enrollAsync, t, toast],
  );

  return { perform, isLoading: addToCart.isPending || enroll.isPending };
}
