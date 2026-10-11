import { View } from 'react-native';

import { AppText } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { makeStyles, spacing } from '@/theme';
import { formatPriceOrFree } from '@/utils/formatPrice';

import type { CartTotals } from '../../cartTotals';

export type OrderTotalsProps = {
  totals: CartTotals;
  /** Label of the last row ("Total (2 courses)" on the cart, "Total" on checkout). */
  totalLabel: string;
  testID?: string;
};

/** Subtotal, discount (only when there is one) and the big total of the PC order summary. */
export function OrderTotals({ totals, totalLabel, testID }: OrderTotalsProps) {
  const { t } = useTranslation('cart');
  const styles = useStyles();
  const hasDiscount = totals.discountCents > 0;
  return (
    <View style={styles.wrap} testID={testID}>
      {hasDiscount ? (
        <>
          <View style={styles.row}>
            <AppText variant="body" color="textSecondary">
              {t('summary.subtotal')}
            </AppText>
            <AppText variant="body">{formatPriceOrFree(totals.subtotalCents)}</AppText>
          </View>
          <View style={styles.row}>
            <AppText variant="body" color="textSecondary">
              {t('summary.discount')}
            </AppText>
            <AppText variant="body" color="primaryText" testID="order-discount">
              {`-${formatPriceOrFree(totals.discountCents)}`}
            </AppText>
          </View>
          <View style={styles.divider} />
        </>
      ) : null}
      <View style={styles.row}>
        <AppText variant="title">{totalLabel}</AppText>
        <AppText variant="h2" testID="order-total">
          {formatPriceOrFree(totals.totalCents)}
        </AppText>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  divider: { height: 1, marginVertical: spacing.xs, backgroundColor: t.colors.border },
}));
