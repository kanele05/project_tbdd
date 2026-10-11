import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, BackHandler } from 'react-native';

import { useToast } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { getErrorMessage, isAppError } from '@/lib/appError';
import type { CheckoutResponse, PaymentMethod } from '@/types/api';

import { useCart, useCheckout } from './hooks';

export type CheckoutPhase =
  { kind: 'form' } | { kind: 'success'; result: CheckoutResponse } | { kind: 'failed' };

const PAYMENT_FAILED_CODE = 'PAYMENT_FAILED';

function isPaymentFailure(error: unknown): boolean {
  return isAppError(error) && (error.status === 402 || error.code === PAYMENT_FAILED_CODE);
}

/**
 * State and actions of Checkout (SC-13), shared by the phone and the PC screen: the cart query,
 * the chosen payment method, the pay request and its result phase (form -> success | failed),
 * plus the navigation after a result.
 */
export function useCheckoutFlow() {
  const { t } = useTranslation('cart');
  const toast = useToast();
  const cartQuery = useCart();
  const { mutateAsync: payAsync, isPending: isPaying } = useCheckout();
  const [method, setMethod] = useState<PaymentMethod>('MOCK_CARD');
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [phase, setPhase] = useState<CheckoutPhase>({ kind: 'form' });

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
    AccessibilityInfo.announceForAccessibility(t('result.successAnnouncement'));
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

  return {
    cartQuery,
    method,
    setMethod,
    simulateFailure,
    setSimulateFailure,
    phase,
    isPaying,
    handlePay,
    handleStartLearning,
    handleGoToMyCourses,
    handleTryAgain,
    handleBackToCart,
    handleExplore,
  };
}

export type CheckoutFlow = ReturnType<typeof useCheckoutFlow>;
