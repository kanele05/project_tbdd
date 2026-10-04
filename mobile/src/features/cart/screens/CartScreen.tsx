import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CourseCardHorizontalSkeleton } from '@/components/course';
import { EmptyState, ErrorState, ScreenHeader, useToast } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { getErrorMessage } from '@/lib/appError';
import { layout, makeStyles, spacing, useTheme } from '@/theme';
import type { CartItemDto, CourseSummary } from '@/types/api';
import { confirmAction } from '@/utils/confirmAction';

import { CartItemCard } from '../components/CartItemCard';
import { CART_SUMMARY_BAR_CLEARANCE, CartSummaryBar } from '../components/CartSummaryBar';
import { useCart, useRemoveFromCart } from '../hooks';

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
 * SC-12 Cart: course rows (remove with confirmation), glass total bar and Checkout. Empty cart ->
 * EmptyState "Your cart is empty" + "Explore courses".
 */
export function CartScreen() {
  const { t } = useTranslation(['cart', 'common']);
  const { colors } = useTheme();
  const themed = useStyles();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { data: cart, isPending, isError, error, refetch } = useCart();
  const { mutate: removeFromCart, isPending: isRemovePending, variables } = useRemoveFromCart();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const removingId = isRemovePending ? variables : null;

  const handleOpenCourse = useCallback((course: CourseSummary) => {
    router.push(`/course/${course.id}`);
  }, []);

  const handleRemove = useCallback(
    async (course: CourseSummary) => {
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
        onRemove={(course) => void handleRemove(course)}
      />
    ),
    [handleOpenCourse, handleRemove, removingId],
  );

  const handleExplore = useCallback(() => router.dismissTo('/search'), []);
  const handleCheckout = useCallback(() => router.push('/checkout'), []);

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

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
}));

const styles = StyleSheet.create({
  list: { gap: spacing.md, padding: layout.screenPaddingX },
  empty: { flex: 1 },
});
