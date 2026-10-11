import { StyleSheet, View } from 'react-native';

import { CinematicHeader, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, spacing } from '@/theme';

import { CheckoutForm } from '../components/CheckoutForm';
import { PaymentFailedView, PaymentSuccessView } from '../components/PaymentResultView';
import { useCheckoutFlow } from '../useCheckoutFlow';
import { CheckoutDesktopScreen } from './CheckoutDesktopScreen';

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
 * SC-13 Checkout on a phone: order summary, mock payment method (radio), "Pay $X", then a result
 * view: success (Start learning / Go to My Courses) or failure (402 -> Try again, cart untouched).
 */
function CheckoutPhoneScreen() {
  const { t } = useTranslation(['cart', 'common']);
  const themed = useStyles();
  const flow = useCheckoutFlow();
  const { data: cart, isError, error, refetch } = flow.cartQuery;
  const { phase } = flow;

  let body;
  if (phase.kind === 'success') {
    body = (
      <PaymentSuccessView
        courseCount={phase.result.enrolledCourseIds.length || phase.result.order.items.length}
        onStartLearning={flow.handleStartLearning}
        onGoToMyCourses={flow.handleGoToMyCourses}
      />
    );
  } else if (phase.kind === 'failed') {
    body = (
      <PaymentFailedView onTryAgain={flow.handleTryAgain} onBackToCart={flow.handleBackToCart} />
    );
  } else if (cart && cart.items.length > 0) {
    body = (
      <CheckoutForm
        cart={cart}
        method={flow.method}
        onChangeMethod={flow.setMethod}
        simulateFailure={flow.simulateFailure}
        onChangeSimulateFailure={flow.setSimulateFailure}
        isPaying={flow.isPaying}
        onPay={() => void flow.handlePay()}
      />
    );
  } else if (cart) {
    body = (
      <EmptyState
        icon="shopping-cart"
        title={t('cart:empty.title')}
        actionLabel={t('common:actions.exploreCourses')}
        onAction={flow.handleExplore}
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

/** SC-13 Checkout: the phone page below 768 dp, the two-column PC page from 768 dp (PLAN §2.5). */
export function CheckoutScreen() {
  const { isWide } = useBreakpoint();
  return isWide ? <CheckoutDesktopScreen /> : <CheckoutPhoneScreen />;
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
}));

const styles = StyleSheet.create({
  skeleton: { gap: spacing.md, padding: layout.screenPaddingX },
  empty: { flex: 1 },
});
