import Feather from '@expo/vector-icons/Feather';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

import { formatCountdown } from '../useCountdown';

type LockoutBannerProps = {
  /** Seconds until the account unlocks; the banner is hidden at 0. */
  secondsLeft: number;
};

/** 423 ACCOUNT_LOCKED: explains the lock and counts down to the next allowed attempt. */
export function LockoutBanner({ secondsLeft }: LockoutBannerProps) {
  const { t } = useTranslation('auth');
  const { colors } = useTheme();
  const styles = useStyles();
  if (secondsLeft <= 0) return null;
  return (
    <View
      style={styles.container}
      accessibilityRole="alert"
      accessibilityLabel={`${t('lockout.title')} ${t('lockout.retryIn', { time: formatCountdown(secondsLeft) })}`}
      testID="lockout-banner"
    >
      <Feather name="lock" size={18} color={colors.danger} />
      <View style={styles.text}>
        <AppText variant="label" color="dangerText">
          {t('lockout.title')}
        </AppText>
        <AppText variant="body" color="dangerText" testID="lockout-countdown">
          {t('lockout.retryIn', { time: formatCountdown(secondsLeft) })}
        </AppText>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.button,
    backgroundColor: t.colors.dangerSoft,
  },
  text: { flex: 1, gap: spacing.xxs },
}));
