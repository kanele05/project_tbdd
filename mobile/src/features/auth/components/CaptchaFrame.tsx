import type { ReactNode } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing } from '@/theme';

export type CaptchaStatus = 'loading' | 'ready' | 'error';

type CaptchaFrameProps = {
  status: CaptchaStatus;
  onRetry: () => void;
  /** The widget surface (WebView / DOM container). Always mounted so it can finish loading. */
  children: ReactNode;
};

type CaptchaGateProps = {
  onVerify: () => void;
};

export function CaptchaGate({ onVerify }: CaptchaGateProps) {
  const { t } = useTranslation('auth');
  const styles = useStyles();

  return (
    <View style={styles.gate}>
      <AppText variant="body" color="textSecondary" align="center">
        {t('captcha.verifyPrompt')}
      </AppText>
      <Button title={t('captcha.verify')} onPress={onVerify} fullWidth testID="captcha-verify" />
    </View>
  );
}

/** Shared chrome of the CAPTCHA widgets: a caption while it loads and a retry button when it fails. */
export function CaptchaFrame({ status, onRetry, children }: CaptchaFrameProps) {
  const { t } = useTranslation('auth');
  const styles = useStyles();
  return (
    <View style={styles.frame} testID="captcha-frame">
      <View style={status === 'error' ? styles.hidden : styles.surface}>{children}</View>
      {status === 'loading' ? (
        <AppText variant="caption" align="center" accessibilityLiveRegion="polite">
          {t('captcha.loading')}
        </AppText>
      ) : null}
      {status === 'error' ? (
        <View style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="assertive">
          <AppText variant="body" color="dangerText" align="center">
            {t('captcha.error')}
          </AppText>
          <Button
            title={t('captcha.retry')}
            variant="outline"
            size="sm"
            leftIcon="refresh-cw"
            onPress={onRetry}
            testID="captcha-retry"
          />
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  frame: { gap: spacing.sm, alignItems: 'center' },
  gate: { alignSelf: 'stretch', gap: spacing.md, alignItems: 'center' },
  surface: { alignSelf: 'stretch', minHeight: 70, alignItems: 'center', justifyContent: 'center' },
  hidden: { height: 0, overflow: 'hidden' },
  error: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: t.colors.dangerSoft,
  },
}));
