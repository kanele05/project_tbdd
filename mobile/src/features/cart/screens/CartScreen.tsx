import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CourseCardHorizontalSkeleton } from '@/components/course';
import { EmptyState, ErrorState, ScreenHeader } from '@/components/ui';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, spacing, useTheme } from '@/theme';
import type { CartItemDto, CourseSummary } from '@/types/api';

import { CartItemCard } from '../components/CartItemCard';
import { CART_SUMMARY_BAR_CLEARANCE, CartSummaryBar } from '../components/CartSummaryBar';
import { useCart } from '../hooks';
import { useCartActions } from '../useCartActions';
import { CartDesktopScreen } from './CartDesktopScreen';

function keyOf(item: CartItemDto): string {
  return item.course.id;
}

function CartSkeleton() {
  const { t } = useTranslation('cart');
  return (
    <View
      style={styles.list}
      testID="cart-skeleton"
      accessible
      accessibilityLabel={t('loading')}
      accessibilityState={{ busy: true }}
    >
      <CourseCardHorizontalSkeleton />
      <CourseCardHorizontalSkeleton />
      <CourseCardHorizontalSkeleton />
    </View>
  );
}

/**
 * SC-12 Cart on a phone: course rows (remove with confirmation), glass total bar and Checkout.
 * Empty cart -> EmptyState "Your cart is empty" + "Explore courses".
 */
function CartPhoneScreen() {
  const { t } = useTranslation(['cart', 'common']);
  const { colors } = useTheme();
  const themed = useStyles();
  const insets = useSafeAreaInsets();
  const { data: cart, isPending, isError, error, refetch } = useCart();
  const { removingId, handleOpenCourse, handleRemove, handleExplore, handleCheckout } =
    useCartActions();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  const renderItem = useCallback(
    ({ item }: { item: CartItemDto }) => (
      <CartItemCard
        course={item.course}
        isRemoving={removingId === item.course.id}
        onPress={handleOpenCourse}
        onRemove={(course: CourseSummary) => void handleRemove(course)}
      />
    ),
    [handleOpenCourse, handleRemove, removingId],
  );

  const items = cart?.items ?? [];
  let content;
  if (cart && items.length > 0) {
    content = (
      <>
        <FlatList
          data={items}
          keyExtractor={keyOf}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: CART_SUMMARY_BAR_CLEARANCE + insets.bottom + spacing.xxl },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void handleRefresh()}
              colors={[colors.primary]}
              tintColor={colors.primaryText}
            />
          }
        />
        <CartSummaryBar
          itemCount={items.length}
          totalCents={cart.totalCents}
          onCheckout={handleCheckout}
          isBusy={removingId !== null}
        />
      </>
    );
  } else if (cart) {
    content = (
      <EmptyState
        icon="shopping-cart"
        title={t('cart:empty.title')}
        message={t('cart:empty.message')}
        actionLabel={t('common:actions.exploreCourses')}
        onAction={handleExplore}
        style={styles.empty}
      />
    );
  } else if (isError) {
    content = <ErrorState error={error} onRetry={() => void refetch()} />;
  } else {
    content = isPending ? <CartSkeleton /> : null;
  }

  return (
    <View style={themed.screen}>
      <ScreenHeader title={t('cart:title')} />
      {content}
    </View>
  );
}

/** SC-12 Cart: the phone list below 768 dp, the two-column PC page from 768 dp (PLAN §2.5). */
export function CartScreen() {
  const { isWide } = useBreakpoint();
  return isWide ? <CartDesktopScreen /> : <CartPhoneScreen />;
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
}));

const styles = StyleSheet.create({
  list: { gap: spacing.md, padding: layout.screenPaddingX },
  empty: { flex: 1 },
});
