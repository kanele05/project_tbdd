import { router } from 'expo-router';
import { useCallback } from 'react';

import type { DesktopCardCourse } from '@/components/course/CourseCardDesktop';
import { showToast } from '@/components/ui/Toast';
import { useToggleBookmark } from '@/features/bookmark/hooks';
import { useAddToCart } from '@/features/cart/hooks';
import { useTranslation } from '@/i18n';
import { getErrorMessage } from '@/lib/appError';

import { openCourse } from './navigation';

/**
 * Callbacks of the hover card on the desktop web layout (`CourseCardDesktop`): open the course,
 * save / unsave it and add it to the cart with a toast ("View cart" action). All stable, so the
 * memoized cards do not re-render.
 */
export function useQuickCardActions() {
  const { t } = useTranslation('course');
  const { toggleBookmark } = useToggleBookmark();
  const { mutateAsync: addToCart } = useAddToCart();

  const onPress = useCallback((course: DesktopCardCourse) => openCourse(course.id), []);
  const onToggleBookmark = useCallback(
    (course: DesktopCardCourse) => toggleBookmark(course.id, course.isBookmarked ?? false),
    [toggleBookmark],
  );
  const onAddToCart = useCallback(
    async (course: DesktopCardCourse) => {
      try {
        await addToCart(course.id);
        showToast(t('toast.addedToCart'), {
          type: 'success',
          actionLabel: t('toast.viewCart'),
          onAction: () => router.push('/cart'),
        });
      } catch (error) {
        showToast(getErrorMessage(error), { type: 'error' });
      }
    },
    [addToCart, t],
  );

  return { onPress, onToggleBookmark, onAddToCart };
}
