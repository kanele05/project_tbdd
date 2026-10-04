import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing } from '@/theme';
import type { CartItemDto } from '@/types/api';
import { formatPriceOrFree } from '@/utils/formatPrice';

export type OrderSummaryCardProps = {
  items: readonly CartItemDto[];
  totalCents: number;
};

/** Checkout "Order summary": one line per course and the serif total, on a hairline card. */
export function OrderSummaryCard({ items, totalCents }: OrderSummaryCardProps) {
  const { t } = useTranslation('cart');
  const themed = useStyles();
  return (
    <View style={themed.card}>
      {items.map(({ course }) => (
        <View key={course.id} style={styles.row}>
          <AppText variant="body" numberOfLines={2} style={styles.title}>
            {course.title}
          </AppText>
          <AppText variant="body" family="bodySemiBold">
            {formatPriceOrFree(course.priceCents)}
          </AppText>
        </View>
      ))}
      <View style={themed.divider} />
      <View style={[styles.row, styles.totalRow]}>
        <AppText variant="title">{t('checkout.total')}</AppText>
        <AppText variant="h2" color="primaryText" testID="order-total">
          {formatPriceOrFree(totalCents)}
        </AppText>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    borderRadius: radius.card,
    backgroundColor: t.colors.card,
  },
  divider: { height: 1, backgroundColor: t.colors.border },
}));

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  totalRow: { alignItems: 'center' },
  title: { flex: 1 },
});
