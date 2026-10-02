import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { CartItemDto } from '@/types/api';
import { formatPriceOrFree } from '@/utils/formatPrice';

export type OrderSummaryCardProps = {
  items: readonly CartItemDto[];
  totalCents: number;
};

/** Checkout "Order summary": one line per course and the total. */
export function OrderSummaryCard({ items, totalCents }: OrderSummaryCardProps) {
  return (
    <View style={styles.card}>
      {items.map(({ course }) => (
        <View key={course.id} style={styles.row}>
          <AppText variant="body" numberOfLines={2} style={styles.title}>
            {course.title}
          </AppText>
          <AppText variant="body" family="bodyMedium">
            {formatPriceOrFree(course.priceCents)}
          </AppText>
        </View>
      ))}
      <View style={styles.divider} />
      <View style={styles.row}>
        <AppText variant="title">Total</AppText>
        <AppText variant="title" color="primary" family="headingBold" testID="order-total">
          {formatPriceOrFree(totalCents)}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    backgroundColor: colors.background,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: { flex: 1 },
  divider: { height: 1, backgroundColor: colors.border },
});
