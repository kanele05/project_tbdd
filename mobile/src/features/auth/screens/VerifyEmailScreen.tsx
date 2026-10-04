import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useTranslation } from '@/i18n';
import { toAppError } from '@/lib/appError';
import { makeStyles, spacing } from '@/theme';

import { getAuthErrorDetails, getAuthErrorMessage, isDeadCodeError } from '../authErrors';
import { useAuthFlowStore } from '../authFlowStore';
import { AuthLayout } from '../components/AuthLayout';
import { FormError } from '../components/FormError';
import { OtpInput } from '../components/OtpInput';
import { useResendVerification, useVerifyEmail } from '../hooks';
import { goToLogin } from '../navigation';
import { OTP_LENGTH } from '../schemas';
import { formatCountdown, useCountdown } from '../useCountdown';

/**
 * Email verification: the 6-digit code mailed after sign-up (or after a login of an unverified
 * account). The right code logs the user in. Shows the tries left, a resend countdown, and asks for
 * a new code once the old one is expired or used up.
 */
export function VerifyEmailScreen() {
  const { t } = useTranslation('auth');
  const toast = useToast();
  const styles = useStyles();
  const flow = useAuthFlowStore((state) => state.verifyEmail);
  // The flow lives in memory only: after a reload there is nothing to verify, back to Login.
  const hadFlow = useRef(flow !== null);
  const verify = useVerifyEmail();
  const resend = useResendVerification();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCodeDead, setIsCodeDead] = useState(false);
  const secondsLeft = useCountdown(flow?.resendAvailableAt ?? null);
  const email = flow?.email ?? '';

  useEffect(() => {
    if (!hadFlow.current) goToLogin();
  }, []);

  if (!flow) return null;

  const submit = async (value: string) => {
    if (verify.isPending) return;
    setError(null);
    try {
      await verify.mutateAsync({ email, code: value });
      useAuthFlowStore.getState().clearVerifyEmail();
      router.replace('/');
    } catch (caught) {
      if (toAppError(caught).code === 'ALREADY_VERIFIED') {
        // Verified on another device in the meantime: just sign in.
        useAuthFlowStore.getState().clearVerifyEmail();
        toast.info(t('verifyEmail.alreadyVerified'));
        goToLogin();
        return;
      }
      setError(getAuthErrorMessage(caught));
      setIsCodeDead(isDeadCodeError(caught));
      setCode('');
    }
  };

  const onResend = async () => {
    setError(null);
    try {
      const sent = await resend.mutateAsync({ email });
      useAuthFlowStore.getState().setResendAvailableAt(Date.now() + sent.resendAfter * 1000);
      setIsCodeDead(false);
      setCode('');
      toast.success(t('verifyEmail.codeSent'));
    } catch (caught) {
      const { retryAfterSec } = getAuthErrorDetails(caught);
      if (toAppError(caught).code === 'RESEND_TOO_SOON' && retryAfterSec !== undefined) {
        useAuthFlowStore.getState().setResendAvailableAt(Date.now() + retryAfterSec * 1000);
      }
      setError(getAuthErrorMessage(caught));
    }
  };

  const canResend = secondsLeft === 0 && !resend.isPending;

  return (
    <AuthLayout
      icon="mail"
      title={t('verifyEmail.title')}
      subtitle={t('verifyEmail.subtitle', { email })}
      onBack={goToLogin}
    >
      <OtpInput
        value={code}
        onChange={setCode}
        onComplete={submit}
        label={t('otp.label')}
        autoFocus
        hasError={error !== null && !isCodeDead}
        testID="verify-otp"
      />
      <FormError message={error} />
      <Button
        title={t('verifyEmail.submit')}
        onPress={() => void submit(code)}
        loading={verify.isPending}
        disabled={code.length < OTP_LENGTH}
        fullWidth
        testID="verify-submit"
      />
      <View style={styles.resend}>
        {secondsLeft > 0 ? (
          <AppText variant="body" color="textSecondary" align="center" testID="resend-countdown">
            {t('verifyEmail.resendIn', { time: formatCountdown(secondsLeft) })}
          </AppText>
        ) : (
          <Button
            title={t('verifyEmail.resend')}
            variant={isCodeDead ? 'outline' : 'ghost'}
            leftIcon="send"
            loading={resend.isPending}
            disabled={!canResend}
            onPress={() => void onResend()}
            style={styles.centerSelf}
            testID="resend-button"
          />
        )}
      </View>
    </AuthLayout>
  );
}

const useStyles = makeStyles(() => ({
  resend: { alignItems: 'center', justifyContent: 'center', minHeight: 48, marginTop: spacing.xs },
  centerSelf: { alignSelf: 'center' },
}));
