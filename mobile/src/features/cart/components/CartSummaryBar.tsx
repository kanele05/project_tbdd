import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { formatPrice } from '@/utils/formatPrice';

export type CartSummaryBarProps = {
  itemCount: number;
  totalCents: number;
  onCheckout: () => void;
  /** Disables Checkout while a removal is in flight (the total is about to change). */
  isBusy?: boolean;
};

/** Fixed bar at the bottom of the cart: item count + total on the left, Checkout on the right. */
export function CartSummaryBar({ itemCount, totalCents, onCheckout, isBusy }: CartSummaryBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      <View
        accessible
        accessibilityLabel={`Total ${formatPrice(totalCents)} for ${itemCount} ${
          itemCount === 1 ? 'course' : 'courses'
        }`}
      >
        <AppText variant="caption">{`Total (${itemCount} ${itemCount === 1 ? 'course' : 'courses'})`}</AppText>
        <AppText variant="h2" family="headingBold">
          {formatPrice(totalCents)}
        </AppText>
      </View>
      <Button
        title="Checkout"
        onPress={onCheckout}
        disabled={itemCount === 0 || isBusy}
        rightIcon="arrow-right"
        style={styles.button}
        testID="cart-checkout-button"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  button: { minWidth: 140 },
});
