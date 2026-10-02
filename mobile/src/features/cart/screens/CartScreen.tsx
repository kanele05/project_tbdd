import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { CourseCardHorizontalSkeleton } from '@/components/course';
import { EmptyState, ErrorState, ScreenHeader, useToast } from '@/components/ui';
import { STRINGS } from '@/constants/strings';
import { getErrorMessage } from '@/lib/appError';
import { colors, layout, spacing } from '@/theme';
import type { CartItemDto, CourseSummary } from '@/types/api';

import { CartItemCard } from '../components/CartItemCard';
import { CartSummaryBar } from '../components/CartSummaryBar';
import { useCart, useRemoveFromCart } from '../hooks';

function keyOf(item: CartItemDto): string {
  return item.course.id;
}

function CartSkeleton() {
  return (
    <View style={styles.list} testID="cart-skeleton">
      <CourseCardHorizontalSkeleton />
      <CourseCardHorizontalSkeleton />
      <CourseCardHorizontalSkeleton />
    </View>
  );
}

/**
 * SC-12 Cart: course rows (remove with confirmation), total and Checkout. Empty cart -> EmptyState
 * "Your cart is empty" + "Explore courses".
 */
export function CartScreen() {
  const toast = useToast();
  const { data: cart, isPending, isError, error, refetch } = useCart();
  const { mutate: removeFromCart, isPending: isRemovePending, variables } = useRemoveFromCart();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const removingId = isRemovePending ? variables : null;

  const handleOpenCourse = useCallback((course: CourseSummary) => {
    router.push(`/course/${course.id}`);
  }, []);

  const handleRemove = useCallback(
    (course: CourseSummary) => {
      Alert.alert('Remove from cart?', `"${course.title}" will be removed from your cart.`, [
        { text: STRINGS.common.cancel, style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () =>
            removeFromCart(course.id, { onError: (e) => toast.error(getErrorMessage(e)) }),
        },
      ]);
    },
    [removeFromCart, toast],
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
        onRemove={handleRemove}
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
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void handleRefresh()}
              colors={[colors.primary]}
              tintColor={colors.primary}
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
        title="Your cart is empty"
        message="Courses you add to your cart will show up here."
        actionLabel={STRINGS.common.exploreCourses}
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
    <View style={styles.screen}>
      <ScreenHeader title="My cart" />
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { gap: spacing.md, padding: layout.screenPaddingX },
  empty: { flex: 1 },
});
