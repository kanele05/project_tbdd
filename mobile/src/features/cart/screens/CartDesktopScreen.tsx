import { useCallback, useMemo } from 'react';
import { ScrollView, View } from 'react-native';

import { PageContainer } from '@/components/layout/PageContainer';
import { TwoColumn, WorkFrame, WorkHeader } from '@/components/layout/work';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { makeStyles, spacing } from '@/theme';
import type { CartDto, CourseSummary } from '@/types/api';

import { getCartTotals } from '../cartTotals';
import { CartItemRowDesktop } from '../components/desktop/CartItemRowDesktop';
import { CartRecommendations } from '../components/desktop/CartRecommendations';
import { CartSummaryDesktop } from '../components/desktop/CartSummaryDesktop';
import { useCart } from '../hooks';
import { useCartActions } from '../useCartActions';

const SUMMARY_WIDTH = 380;
const SKELETON_KEYS = ['a', 'b', 'c'] as const;

function CartDesktopSkeleton() {
  const { t } = useTranslation('cart');
  const styles = useStyles();
  return (
    <View
      style={styles.list}
      testID="cart-skeleton"
      accessible
      accessibilityLabel={t('loading')}
      accessibilityState={{ busy: true }}
    >
      {SKELETON_KEYS.map((key) => (
        <Skeleton key={key} height={132} />
      ))}
    </View>
  );
}

type CartContentProps = { cart: CartDto };

/** Items on the left, the sticky order summary on the right (stacked below 1024). */
function CartContent({ cart }: CartContentProps) {
  const styles = useStyles();
  const { removingId, handleOpenCourse, handleRemove, handleCheckout } = useCartActions();
  const totals = useMemo(() => getCartTotals(cart.items, cart.totalCents), [cart]);
  const handleRemoveItem = useCallback(
    (course: CourseSummary) => void handleRemove(course),
    [handleRemove],
  );
  return (
    <TwoColumn
      testID="cart-columns"
      sideWidth={SUMMARY_WIDTH}
      main={
        <View style={styles.list}>
          {cart.items.map(({ course }) => (
            <CartItemRowDesktop
              key={course.id}
              course={course}
              isRemoving={removingId === course.id}
              onOpen={handleOpenCourse}
              onRemove={handleRemoveItem}
            />
          ))}
        </View>
      }
      side={
        <CartSummaryDesktop
          itemCount={cart.items.length}
          totals={totals}
          onCheckout={handleCheckout}
          isBusy={removingId !== null}
        />
      }
    />
  );
}

/**
 * SC-12 Cart on a PC window (PLAN §2.5): item rows with big photos on the left, a sticky order
 * summary with Checkout on the right and, under it, a row of recommended courses. An empty cart
 * shows the "Explore courses" call to action above the same row.
 */
export function CartDesktopScreen() {
  const { t } = useTranslation(['cart', 'common']);
  const styles = useStyles();
  const { data: cart, isError, error, refetch } = useCart();
  const { handleExplore } = useCartActions();
  const items = cart?.items;
  const excludeIds = useMemo(() => (items ?? []).map(({ course }) => course.id), [items]);
  const count = items?.length ?? 0;

  let content;
  if (cart && count > 0) {
    content = <CartContent cart={cart} />;
  } else if (cart) {
    content = (
      <EmptyState
        icon="shopping-cart"
        title={t('cart:empty.title')}
        message={t('cart:empty.message')}
        actionLabel={t('common:actions.exploreCourses')}
        onAction={handleExplore}
      />
    );
  } else if (isError) {
    content = <ErrorState error={error} onRetry={() => void refetch()} />;
  } else {
    content = <CartDesktopSkeleton />;
  }

  return (
    <WorkFrame testID="cart-desktop">
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator>
        <PageContainer>
          <WorkHeader
            title={t('cart:title')}
            subtitle={count > 0 ? t('cart:desktop.subtitle', { count }) : undefined}
          />
          {content}
        </PageContainer>
        {cart ? <CartRecommendations excludeIds={excludeIds} /> : null}
      </ScrollView>
    </WorkFrame>
  );
}

const useStyles = makeStyles(() => ({
  page: { paddingTop: spacing.xxl, paddingBottom: spacing.huge },
  list: { gap: spacing.md },
}));
