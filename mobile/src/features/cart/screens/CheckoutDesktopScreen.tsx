import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { TwoColumn, WorkHeader, WorkShell } from '@/components/layout/work';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing } from '@/theme';

import { getCartTotals } from '../cartTotals';
import { CheckoutSummaryDesktop } from '../components/desktop/CheckoutSummaryDesktop';
import { BillingPanel, PaymentPanel } from '../components/desktop/PaymentPanels';
import { PaymentFailedView, PaymentSuccessView } from '../components/PaymentResultView';
import { useCheckoutFlow, type CheckoutFlow } from '../useCheckoutFlow';

const CHECKOUT_MAX_WIDTH = 1100;
const SUMMARY_WIDTH = 400;
const RESULT_CARD_WIDTH = 520;

function CheckoutDesktopSkeleton() {
  const { t } = useTranslation('cart');
  return (
    <View
      style={styles.skeleton}
      testID="checkout-skeleton"
      accessible
      accessibilityLabel={t('checkout.loading')}
      accessibilityState={{ busy: true }}
    >
      <View style={styles.skeletonMain}>
        <Skeleton height={96} />
        <Skeleton height={260} />
      </View>
      <Skeleton height={320} width={SUMMARY_WIDTH} />
    </View>
  );
}

/** Payment result in a centred card (success: Start learning / My Courses, failed: Try again). */
function ResultCard({ flow }: { flow: CheckoutFlow }) {
  const themed = useStyles();
  const { phase } = flow;
  return (
    <View style={themed.resultCard} testID="checkout-result-card">
      {phase.kind === 'success' ? (
        <PaymentSuccessView
          courseCount={phase.result.enrolledCourseIds.length || phase.result.order.items.length}
          onStartLearning={flow.handleStartLearning}
          onGoToMyCourses={flow.handleGoToMyCourses}
          isEmbedded
          style={styles.resultView}
        />
      ) : (
        <PaymentFailedView
          onTryAgain={flow.handleTryAgain}
          onBackToCart={flow.handleBackToCart}
          isEmbedded
          style={styles.resultView}
        />
      )}
    </View>
  );
}

/**
 * SC-13 Checkout on a PC window (PLAN §2.5): billing and payment method on the left, the order
 * summary with the Pay button on the right (sticky). A payment result replaces both with one
 * centred card.
 */
export function CheckoutDesktopScreen() {
  const { t } = useTranslation(['cart', 'common']);
  const flow = useCheckoutFlow();
  const { data: cart, isError, error, refetch } = flow.cartQuery;
  const totals = useMemo(() => (cart ? getCartTotals(cart.items, cart.totalCents) : null), [cart]);
  const isForm = flow.phase.kind === 'form';

  let body;
  if (!isForm) {
    body = <ResultCard flow={flow} />;
  } else if (cart && totals && cart.items.length > 0) {
    body = (
      <TwoColumn
        testID="checkout-columns"
        sideWidth={SUMMARY_WIDTH}
        main={
          <>
            <BillingPanel />
            <PaymentPanel
              method={flow.method}
              onChangeMethod={flow.setMethod}
              simulateFailure={flow.simulateFailure}
              onChangeSimulateFailure={flow.setSimulateFailure}
              isPaying={flow.isPaying}
            />
          </>
        }
        side={
          <CheckoutSummaryDesktop
            cart={cart}
            totals={totals}
            isPaying={flow.isPaying}
            onPay={() => void flow.handlePay()}
          />
        }
      />
    );
  } else if (cart) {
    body = (
      <EmptyState
        icon="shopping-cart"
        title={t('cart:empty.title')}
        actionLabel={t('common:actions.exploreCourses')}
        onAction={flow.handleExplore}
      />
    );
  } else if (isError) {
    body = <ErrorState error={error} onRetry={() => void refetch()} />;
  } else {
    body = <CheckoutDesktopSkeleton />;
  }

  return (
    <WorkShell maxWidth={CHECKOUT_MAX_WIDTH} testID="checkout-desktop">
      {isForm ? (
        <WorkHeader title={t('cart:checkout.title')} hasBack onBack={flow.handleBackToCart} />
      ) : null}
      {body}
    </WorkShell>
  );
}

const useStyles = makeStyles((t) => ({
  resultCard: {
    width: '100%',
    maxWidth: RESULT_CARD_WIDTH,
    alignSelf: 'center',
    marginTop: spacing.xxxl,
    padding: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
  },
}));

const styles = StyleSheet.create({
  skeleton: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xxl },
  skeletonMain: { flex: 1, gap: spacing.xl },
  // The embedded result view sizes to its content (no flex), so it never overflows the card.
  resultView: { paddingVertical: spacing.xxl },
});
