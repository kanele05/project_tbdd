import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, radius, spacing, useTheme } from '@/theme';

export type PaymentSuccessViewProps = {
  /** How many courses were unlocked by this order. */
  courseCount: number;
  onStartLearning: () => void;
  onGoToMyCourses: () => void;
  /** Overrides the full-screen centring (the PC page puts the view inside a card). */
  style?: StyleProp<ViewStyle>;
};

export type PaymentFailedViewProps = {
  onTryAgain: () => void;
  onBackToCart: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Result screen of a successful (mock) payment: accent check, serif title, two actions. */
export function PaymentSuccessView({
  courseCount,
  onStartLearning,
  onGoToMyCourses,
  style,
}: PaymentSuccessViewProps) {
  const { t } = useTranslation('cart');
  const { colors } = useTheme();
  const themed = useStyles();
  return (
    <View style={[styles.container, style]} testID="payment-success">
      <View style={[styles.iconWrap, themed.successBg]}>
        <Feather name="check" size={40} color={colors.primaryText} />
      </View>
      <AppText variant="h1" align="center" accessibilityRole="header">
        {t('result.successTitle')}
      </AppText>
      <AppText variant="bodyLarge" color="textSecondary" align="center">
        {courseCount === 1
          ? t('result.successOne')
          : t('result.successMany', { count: courseCount })}
      </AppText>
      <View style={styles.actions}>
        <Button title={t('result.startLearning')} fullWidth onPress={onStartLearning} />
        <Button
          title={t('result.goToMyCourses')}
          variant="outline"
          fullWidth
          onPress={onGoToMyCourses}
        />
      </View>
    </View>
  );
}

/** Result screen of a failed payment (402 `PAYMENT_FAILED`): the cart is untouched. */
export function PaymentFailedView({ onTryAgain, onBackToCart, style }: PaymentFailedViewProps) {
  const { t } = useTranslation('cart');
  const { colors } = useTheme();
  const themed = useStyles();
  return (
    <View style={[styles.container, style]} testID="payment-failed" accessibilityRole="alert">
      <View style={[styles.iconWrap, themed.failedBg]}>
        <Feather name="x" size={40} color={colors.dangerText} />
      </View>
      <AppText variant="h1" align="center" accessibilityRole="header">
        {t('result.failedTitle')}
      </AppText>
      <AppText variant="bodyLarge" color="textSecondary" align="center">
        {t('result.failedMessage')}
      </AppText>
      <View style={styles.actions}>
        <Button title={t('result.tryAgain')} fullWidth onPress={onTryAgain} />
        <Button title={t('result.backToCart')} variant="ghost" fullWidth onPress={onBackToCart} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  successBg: { backgroundColor: t.colors.primarySoft },
  failedBg: { backgroundColor: t.colors.dangerSoft },
}));

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.screenPaddingX,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  actions: { alignSelf: 'stretch', gap: spacing.md, marginTop: spacing.xxl },
});
