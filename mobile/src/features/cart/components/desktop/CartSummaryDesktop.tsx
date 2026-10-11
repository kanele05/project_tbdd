import { View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing } from '@/theme';

import { OrderTotals } from './OrderTotals';
import type { CartTotals } from '../../cartTotals';

export type CartSummaryDesktopProps = {
  itemCount: number;
  totals: CartTotals;
  onCheckout: () => void;
  /** Disables Checkout while a removal is in flight (the total is about to change). */
  isBusy: boolean;
};

/** Order summary card of the PC cart (sticky in the right column): totals and the Checkout button. */
export function CartSummaryDesktop({
  itemCount,
  totals,
  onCheckout,
  isBusy,
}: CartSummaryDesktopProps) {
  const { t } = useTranslation('cart');
  const styles = useStyles();
  return (
    <View style={styles.card} testID="cart-summary-card">
      <AppText variant="h3" accessibilityRole="header">
        {t('checkout.orderSummary')}
      </AppText>
      <OrderTotals totals={totals} totalLabel={t('summary.total', { count: itemCount })} />
      <Button
        title={t('summary.checkout')}
        onPress={onCheckout}
        disabled={itemCount === 0 || isBusy}
        rightIcon="arrow-right"
        fullWidth
        testID="cart-checkout-button"
      />
      <AppText variant="caption" align="center">
        {t('checkout.demoNote')}
      </AppText>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    gap: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
  },
}));
