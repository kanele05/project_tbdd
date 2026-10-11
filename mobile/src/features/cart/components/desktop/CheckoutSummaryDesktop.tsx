import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing } from '@/theme';
import type { CartDto } from '@/types/api';
import { formatPrice, formatPriceOrFree } from '@/utils/formatPrice';

import { OrderTotals } from './OrderTotals';
import type { CartTotals } from '../../cartTotals';

export type CheckoutSummaryDesktopProps = {
  cart: CartDto;
  totals: CartTotals;
  isPaying: boolean;
  onPay: () => void;
};

const THUMB_WIDTH = 72;

/** Right column of the PC checkout: one line per course, the totals and the "Pay $X" button. */
export function CheckoutSummaryDesktop({
  cart,
  totals,
  isPaying,
  onPay,
}: CheckoutSummaryDesktopProps) {
  const { t } = useTranslation('cart');
  const themed = useStyles();
  return (
    <View style={themed.card} testID="checkout-summary-card">
      <AppText variant="h3" accessibilityRole="header">
        {t('checkout.orderSummary')}
      </AppText>
      <View style={styles.lines}>
        {cart.items.map(({ course }) => (
          <View key={course.id} style={styles.line}>
            <View style={themed.photo}>
              <Image
                source={{ uri: course.thumbnailUrl }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                cachePolicy="memory-disk"
                recyclingKey={course.id}
                accessibilityIgnoresInvertColors
              />
            </View>
            <AppText variant="body" numberOfLines={2} style={styles.lineTitle}>
              {course.title}
            </AppText>
            <AppText variant="body" family="bodySemiBold">
              {formatPriceOrFree(course.priceCents)}
            </AppText>
          </View>
        ))}
      </View>
      <View style={themed.divider} />
      <OrderTotals totals={totals} totalLabel={t('checkout.total')} />
      <Button
        title={t('checkout.pay', { amount: formatPrice(totals.totalCents) })}
        fullWidth
        loading={isPaying}
        onPress={onPay}
        testID="pay-button"
      />
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
  photo: {
    width: THUMB_WIDTH,
    aspectRatio: 16 / 9,
    overflow: 'hidden',
    borderRadius: radius.badge,
    backgroundColor: t.colors.surface,
  },
  divider: { height: 1, backgroundColor: t.colors.border },
}));

const styles = StyleSheet.create({
  lines: { gap: spacing.md },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  lineTitle: { flex: 1, minWidth: 0 },
});
