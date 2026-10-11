import { useCallback, useMemo } from 'react';

import { CourseCardDesktop } from '@/components/course';
import { HoverRail } from '@/components/ui';
import { useHome } from '@/features/home/hooks';
import { useQuickCardActions } from '@/features/search/useQuickCardActions';
import { useTranslation } from '@/i18n';
import type { CourseSummary } from '@/types/api';

export type CartRecommendationsProps = {
  /** Courses already in the cart (not suggested again). */
  excludeIds: readonly string[];
};

const MAX_ITEMS = 12;
const keyOf = (course: CourseSummary): string => course.id;

/**
 * "You might also like" row under the PC cart: the Home recommendations without what is already
 * in the cart, as hover cards (price, add to cart, save). Secondary content: nothing while Home
 * is loading, failed or has nothing to suggest.
 */
export function CartRecommendations({ excludeIds }: CartRecommendationsProps) {
  const { t } = useTranslation('cart');
  const { data } = useHome();
  const { onPress, onToggleBookmark, onAddToCart } = useQuickCardActions();
  const courses = useMemo(
    () => (data?.recommended ?? []).filter((course) => !excludeIds.includes(course.id)),
    [data, excludeIds],
  );
  const renderItem = useCallback(
    (course: CourseSummary, _index: number, width: number) => (
      <CourseCardDesktop
        course={course}
        width={width}
        onPress={onPress}
        onToggleBookmark={onToggleBookmark}
        onAddToCart={onAddToCart}
      />
    ),
    [onAddToCart, onPress, onToggleBookmark],
  );
  if (courses.length === 0) return null;
  return (
    <HoverRail
      title={t('recommendations.title')}
      data={courses.slice(0, MAX_ITEMS)}
      keyExtractor={keyOf}
      renderItem={renderItem}
      testID="cart-recommendations"
    />
  );
}
