import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, GlassSurface } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, spacing } from '@/theme';
import { formatPrice } from '@/utils/formatPrice';

export type CartSummaryBarProps = {
  itemCount: number;
  totalCents: number;
  onCheckout: () => void;
  /** Disables Checkout while a removal is in flight (the total is about to change). */
  isBusy?: boolean;
};

/** Space the cart list must leave under the bar (bar height without the bottom inset). */
export const CART_SUMMARY_BAR_CLEARANCE = 100;

/** Glass bar pinned to the bottom of the cart: item count + serif total, and the neon Checkout. */
export function CartSummaryBar({ itemCount, totalCents, onCheckout, isBusy }: CartSummaryBarProps) {
  const { t } = useTranslation('cart');
  const themed = useStyles();
  const insets = useSafeAreaInsets();
  const total = formatPrice(totalCents);
  return (
    <GlassSurface
      radius={0}
      isBordered={false}
      style={themed.bar}
      contentStyle={[themed.content, { paddingBottom: insets.bottom + spacing.sm }]}
      testID="cart-summary-bar"
    >
      <View
        style={styles.total}
        accessible
        accessibilityLabel={t('summary.a11y', { price: total, count: itemCount })}
      >
        <AppText variant="caption">{t('summary.total', { count: itemCount })}</AppText>
        <AppText variant="h2">{total}</AppText>
      </View>
      <Button
        title={t('summary.checkout')}
        onPress={onCheckout}
        disabled={itemCount === 0 || isBusy}
        rightIcon="arrow-right"
        style={styles.button}
        testID="cart-checkout-button"
      />
    </GlassSurface>
  );
}

const useStyles = makeStyles((t) => ({
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingTop: spacing.md,
    paddingHorizontal: layout.screenPaddingX,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },
}));

const styles = StyleSheet.create({
  total: { flexShrink: 1 },
  button: { minWidth: 156 },
});
