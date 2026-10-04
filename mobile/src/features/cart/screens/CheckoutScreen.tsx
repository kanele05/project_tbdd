import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, BackHandler, StyleSheet, View } from 'react-native';

import { CinematicHeader, EmptyState, ErrorState, Skeleton, useToast } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { getErrorMessage, isAppError } from '@/lib/appError';
import { layout, makeStyles, spacing } from '@/theme';
import type { CheckoutResponse, PaymentMethod } from '@/types/api';

import { CheckoutForm } from '../components/CheckoutForm';
import { PaymentFailedView, PaymentSuccessView } from '../components/PaymentResultView';
import { useCart, useCheckout } from '../hooks';

type Phase = { kind: 'form' } | { kind: 'success'; result: CheckoutResponse } | { kind: 'failed' };

const PAYMENT_FAILED_CODE = 'PAYMENT_FAILED';

function isPaymentFailure(error: unknown): boolean {
  return isAppError(error) && (error.status === 402 || error.code === PAYMENT_FAILED_CODE);
}

function CheckoutSkeleton() {
  const { t } = useTranslation('cart');
  return (
    <View
      style={styles.skeleton}
      testID="checkout-skeleton"
      accessible
      accessibilityLabel={t('checkout.loading')}
      accessibilityState={{ busy: true }}
    >
      <Skeleton height={24} width="40%" />
      <Skeleton height={120} />
      <Skeleton height={24} width="50%" />
      <Skeleton height={72} />
      <Skeleton height={72} />
    </View>
  );
}

/**
 * SC-13 Checkout: order summary, mock payment method (radio), "Pay $X", then a result view:
 * success (Start learning / Go to My Courses) or failure (402 -> Try again, cart untouched).
 */
export function CheckoutScreen() {
  const { t } = useTranslation(['cart', 'common']);
  const themed = useStyles();
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

  const isSuccess = phase.kind === 'success';
  useEffect(() => {
    if (!isSuccess) return undefined;
    AccessibilityInfo.announceForAccessibility(t('cart:result.successAnnouncement'));
    // The cart is empty after a successful payment: system Back goes to My Courses, not back to
    // an empty checkout form / cart.
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      router.dismissTo('/my-courses');
      return true;
    });
    return () => subscription.remove();
  }, [isSuccess, t]);

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
        title={t('cart:empty.title')}
        actionLabel={t('common:actions.exploreCourses')}
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
    <View style={themed.screen}>
      <CinematicHeader
        title={t('cart:checkout.title')}
        uri={cart?.items[0]?.course.thumbnailUrl}
        posterIndex={2}
        showBack={phase.kind === 'form'}
      />
      {body}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
}));

const styles = StyleSheet.create({
  skeleton: { gap: spacing.md, padding: layout.screenPaddingX },
  empty: { flex: 1 },
});
