import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { colors, layout, radius, spacing } from '@/theme';

export type PaymentSuccessViewProps = {
  /** How many courses were unlocked by this order. */
  courseCount: number;
  onStartLearning: () => void;
  onGoToMyCourses: () => void;
};

export type PaymentFailedViewProps = {
  onTryAgain: () => void;
  onBackToCart: () => void;
};

/** Result screen of a successful (mock) payment. */
export function PaymentSuccessView({
  courseCount,
  onStartLearning,
  onGoToMyCourses,
}: PaymentSuccessViewProps) {
  return (
    <View style={styles.container} testID="payment-success">
      <View style={[styles.iconWrap, styles.successBg]}>
        <Feather name="check" size={40} color={colors.success} />
      </View>
      <AppText variant="h2" align="center" accessibilityRole="header">
        Payment successful
      </AppText>
      <AppText variant="body" color="textSecondary" align="center">
        {courseCount === 1
          ? 'You now have access to your new course.'
          : `You now have access to your ${courseCount} new courses.`}
      </AppText>
      <View style={styles.actions}>
        <Button title="Start learning" fullWidth onPress={onStartLearning} />
        <Button title="Go to My Courses" variant="outline" fullWidth onPress={onGoToMyCourses} />
      </View>
    </View>
  );
}

/** Result screen of a failed payment (402 `PAYMENT_FAILED`): the cart is untouched. */
export function PaymentFailedView({ onTryAgain, onBackToCart }: PaymentFailedViewProps) {
  return (
    <View style={styles.container} testID="payment-failed" accessibilityRole="alert">
      <View style={[styles.iconWrap, styles.failedBg]}>
        <Feather name="x" size={40} color={colors.danger} />
      </View>
      <AppText variant="h2" align="center" accessibilityRole="header">
        Payment failed
      </AppText>
      <AppText variant="body" color="textSecondary" align="center">
        We could not process your payment. You have not been charged and your cart is unchanged.
      </AppText>
      <View style={styles.actions}>
        <Button title="Try again" fullWidth onPress={onTryAgain} />
        <Button title="Back to cart" variant="ghost" fullWidth onPress={onBackToCart} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.screenPaddingX,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  successBg: { backgroundColor: colors.primaryLight },
  failedBg: { backgroundColor: colors.dangerLight },
  actions: { alignSelf: 'stretch', gap: spacing.md, marginTop: spacing.xxl },
});
