import Feather from '@expo/vector-icons/Feather';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, GlassSurface } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { CartDto, PaymentMethod } from '@/types/api';
import { formatPrice } from '@/utils/formatPrice';

import { OrderSummaryCard } from './OrderSummaryCard';
import { PaymentMethodPicker } from './PaymentMethodPicker';

export type CheckoutFormProps = {
  cart: CartDto;
  method: PaymentMethod;
  onChangeMethod: (method: PaymentMethod) => void;
  simulateFailure: boolean;
  onChangeSimulateFailure: (value: boolean) => void;
  isPaying: boolean;
  onPay: () => void;
};

/** Space the form leaves under the pinned Pay bar (bar height without the bottom inset). */
const PAY_BAR_CLEARANCE = 96;

/** SC-13 form: order summary, payment methods, the demo note and the glass bar with "Pay $X". */
export function CheckoutForm({
  cart,
  method,
  onChangeMethod,
  simulateFailure,
  onChangeSimulateFailure,
  isPaying,
  onPay,
}: CheckoutFormProps) {
  const { t } = useTranslation('cart');
  const { colors } = useTheme();
  const themed = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: PAY_BAR_CLEARANCE + insets.bottom + spacing.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AppText variant="h2" accessibilityRole="header">
          {t('checkout.orderSummary')}
        </AppText>
        <OrderSummaryCard items={cart.items} totalCents={cart.totalCents} />
        <AppText variant="h2" accessibilityRole="header" style={styles.sectionGap}>
          {t('checkout.paymentMethod')}
        </AppText>
        <PaymentMethodPicker value={method} onChange={onChangeMethod} disabled={isPaying} />
        <View style={themed.note} accessible accessibilityLabel={t('checkout.demoNote')}>
          <Feather name="info" size={18} color={colors.primaryText} />
          <AppText variant="caption" color="textSecondary" style={styles.noteText}>
            {t('checkout.demoNote')}
          </AppText>
        </View>
        {__DEV__ ? (
          <View style={styles.devRow}>
            <AppText variant="body" style={styles.devLabel}>
              {t('checkout.simulateFailure')}
            </AppText>
            <Switch
              value={simulateFailure}
              onValueChange={onChangeSimulateFailure}
              disabled={isPaying}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.white}
              accessibilityLabel={t('checkout.simulateFailure')}
            />
          </View>
        ) : null}
      </ScrollView>
      <GlassSurface
        radius={0}
        isBordered={false}
        style={themed.bar}
        contentStyle={[themed.barContent, { paddingBottom: insets.bottom + spacing.sm }]}
      >
        <Button
          title={t('checkout.pay', { amount: formatPrice(cart.totalCents) })}
          fullWidth
          loading={isPaying}
          onPress={onPay}
          testID="pay-button"
        />
      </GlassSurface>
    </>
  );
}

const useStyles = makeStyles((t) => ({
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.card,
    backgroundColor: t.colors.primarySoft,
  },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  barContent: {
    paddingTop: spacing.md,
    paddingHorizontal: layout.screenPaddingX,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },
}));

const styles = StyleSheet.create({
  content: { gap: spacing.md, padding: layout.screenPaddingX },
  sectionGap: { marginTop: spacing.lg },
  noteText: { flex: 1 },
  devRow: {
    minHeight: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  devLabel: { flex: 1 },
});
