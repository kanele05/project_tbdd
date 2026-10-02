import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppText,
  Button,
  EmptyState,
  ErrorState,
  ScreenHeader,
  Skeleton,
  useToast,
} from '@/components/ui';
import { STRINGS } from '@/constants/strings';
import { getErrorMessage, isAppError } from '@/lib/appError';
import { colors, layout, radius, spacing } from '@/theme';
import type { CartDto, CheckoutResponse, PaymentMethod } from '@/types/api';
import { formatPrice } from '@/utils/formatPrice';

import { OrderSummaryCard } from '../components/OrderSummaryCard';
import { PaymentMethodPicker } from '../components/PaymentMethodPicker';
import { PaymentFailedView, PaymentSuccessView } from '../components/PaymentResultView';
import { useCart, useCheckout } from '../hooks';

type Phase = { kind: 'form' } | { kind: 'success'; result: CheckoutResponse } | { kind: 'failed' };

const PAYMENT_FAILED_CODE = 'PAYMENT_FAILED';

function isPaymentFailure(error: unknown): boolean {
  return isAppError(error) && (error.status === 402 || error.code === PAYMENT_FAILED_CODE);
}

function CheckoutSkeleton() {
  return (
    <View style={styles.content} testID="checkout-skeleton">
      <Skeleton height={20} width="40%" />
      <Skeleton height={120} />
      <Skeleton height={20} width="50%" />
      <Skeleton height={72} />
      <Skeleton height={72} />
    </View>
  );
}

type FormProps = {
  cart: CartDto;
  method: PaymentMethod;
  onChangeMethod: (method: PaymentMethod) => void;
  simulateFailure: boolean;
  onChangeSimulateFailure: (value: boolean) => void;
  isPaying: boolean;
  onPay: () => void;
};

function CheckoutForm({
  cart,
  method,
  onChangeMethod,
  simulateFailure,
  onChangeSimulateFailure,
  isPaying,
  onPay,
}: FormProps) {
  const insets = useSafeAreaInsets();
  return (
    <>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppText variant="title" accessibilityRole="header">
          Order summary
        </AppText>
        <OrderSummaryCard items={cart.items} totalCents={cart.totalCents} />
        <AppText variant="title" accessibilityRole="header" style={styles.sectionGap}>
          Payment method
        </AppText>
        <PaymentMethodPicker value={method} onChange={onChangeMethod} disabled={isPaying} />
        <View style={styles.note} accessible accessibilityLabel="Demo payment, no real card needed">
          <Feather name="info" size={18} color={colors.primary} />
          <AppText variant="caption" color="textSecondary" style={styles.noteText}>
            Demo payment — no real card needed
          </AppText>
        </View>
        {__DEV__ ? (
          <View style={styles.devRow}>
            <AppText variant="body" style={styles.devLabel}>
              Simulate payment failure
            </AppText>
            <Switch
              value={simulateFailure}
              onValueChange={onChangeSimulateFailure}
              disabled={isPaying}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.white}
              accessibilityLabel="Simulate payment failure"
            />
          </View>
        ) : null}
      </ScrollView>
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Button
          title={`Pay ${formatPrice(cart.totalCents)}`}
          fullWidth
          loading={isPaying}
          onPress={onPay}
          testID="pay-button"
        />
      </View>
    </>
  );
}

/**
 * SC-13 Checkout: order summary, mock payment method (radio), "Pay $X", then a result view:
 * success (Start learning / Go to My Courses) or failure (402 -> Try again, cart untouched).
 */
export function CheckoutScreen() {
  const toast = useToast();
  const { data: cart, isError, error, refetch } = useCart();
  const { mutateAsync: payAsync, isPending: isPaying } = useCheckout();
  const [method, setMethod] = useState<PaymentMethod>('MOCK_CARD');
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: 'form' });

  const handlePay = useCallback(async () => {
    try {
      const result = await payAsync({
        paymentMethod: method,
        // The failure switch only exists in dev builds (BR-07 test hook).
        ...(__DEV__ && simulateFailure ? { simulateFailure: true } : null),
      });
      setPhase({ kind: 'success', result });
    } catch (e) {
      if (isPaymentFailure(e)) setPhase({ kind: 'failed' });
      else toast.error(getErrorMessage(e));
    }
  }, [method, payAsync, simulateFailure, toast]);

  const handleStartLearning = useCallback(() => {
    if (phase.kind !== 'success') return;
    const firstId = phase.result.enrolledCourseIds[0] ?? phase.result.order.items[0]?.courseId;
    router.dismissTo('/my-courses');
    if (firstId) router.push(`/learn/${firstId}`);
  }, [phase]);

  const handleGoToMyCourses = useCallback(() => router.dismissTo('/my-courses'), []);
  const handleTryAgain = useCallback(() => setPhase({ kind: 'form' }), []);
  const handleBackToCart = useCallback(() => router.back(), []);
  const handleExplore = useCallback(() => router.dismissTo('/search'), []);

  let body;
  if (phase.kind === 'success') {
    body = (
      <PaymentSuccessView
        courseCount={phase.result.enrolledCourseIds.length || phase.result.order.items.length}
        onStartLearning={handleStartLearning}
        onGoToMyCourses={handleGoToMyCourses}
      />
    );
  } else if (phase.kind === 'failed') {
    body = <PaymentFailedView onTryAgain={handleTryAgain} onBackToCart={handleBackToCart} />;
  } else if (cart && cart.items.length > 0) {
    body = (
      <CheckoutForm
        cart={cart}
        method={method}
        onChangeMethod={setMethod}
        simulateFailure={simulateFailure}
        onChangeSimulateFailure={setSimulateFailure}
        isPaying={isPaying}
        onPay={() => void handlePay()}
      />
    );
  } else if (cart) {
    body = (
      <EmptyState
        icon="shopping-cart"
        title="Your cart is empty"
        actionLabel={STRINGS.common.exploreCourses}
        onAction={handleExplore}
        style={styles.empty}
      />
    );
  } else if (isError) {
    body = <ErrorState error={error} onRetry={() => void refetch()} />;
  } else {
    body = <CheckoutSkeleton />;
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Checkout" showBack={phase.kind === 'form'} />
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { gap: spacing.md, padding: layout.screenPaddingX },
  sectionGap: { marginTop: spacing.md },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.card,
    backgroundColor: colors.primaryLight,
  },
  noteText: { flex: 1 },
  devRow: {
    minHeight: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  devLabel: { flex: 1 },
  bar: {
    paddingTop: spacing.md,
    paddingHorizontal: layout.screenPaddingX,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  empty: { flex: 1 },
});
