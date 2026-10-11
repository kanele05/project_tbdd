import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { useTranslation } from '@/i18n';
import { toAppError } from '@/lib/appError';
import { makeStyles, spacing } from '@/theme';

import { getAuthErrorMessage } from '../authErrors';
import { useAuthFlowStore } from '../authFlowStore';
import { AuthLayout } from '../components/AuthLayout';
import { FormError } from '../components/FormError';
import { OtpInput } from '../components/OtpInput';
import { useTwoFactorLogin } from '../hooks';
import { goToLogin } from '../navigation';
import { OTP_LENGTH, formatRecoveryCode, isCompleteRecoveryCode } from '../schemas';
import { useCountdown } from '../useCountdown';

type Mode = 'code' | 'recovery';

/**
 * Step 2 of a login with two-step verification: the 6-digit code of the authenticator app, or one
 * of the saved recovery codes. The challenge from step 1 lives 5 minutes; after that (or when the
 * server rejects it) the user starts over from Login.
 */
export function TwoFactorScreen() {
  const { t } = useTranslation('auth');
  const toast = useToast();
  const styles = useStyles();
  const flow = useAuthFlowStore((state) => state.twoFactor);
  const hadFlow = useRef(flow !== null);
  const verify = useTwoFactorLogin();
  const [mode, setMode] = useState<Mode>('code');
  const [code, setCode] = useState('');
  const [recovery, setRecovery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const secondsLeft = useCountdown(flow?.expiresAt ?? null);
  const isExpired = flow !== null && secondsLeft === 0;

  const endFlow = (message: string) => {
    useAuthFlowStore.getState().clearTwoFactor();
    toast.info(message);
    goToLogin();
  };

  useEffect(() => {
    if (!hadFlow.current) goToLogin();
  }, []);

  useEffect(() => {
    if (isExpired) {
      useAuthFlowStore.getState().clearTwoFactor();
      toast.info(t('twoFactor.expired'));
      goToLogin();
    }
  }, [isExpired, toast, t]);

  if (!flow) return null;

  const submit = async (value: string) => {
    if (verify.isPending) return;
    setError(null);
    const { challengeToken } = flow;
    try {
      await verify.mutateAsync(
        mode === 'code' ? { challengeToken, code: value } : { challengeToken, recoveryCode: value },
      );
      useAuthFlowStore.getState().clearTwoFactor();
    } catch (caught) {
      const { code: errorCode } = toAppError(caught);
      if (errorCode === 'INVALID_CHALLENGE') {
        endFlow(t('twoFactor.expired'));
        return;
      }
      if (errorCode === 'ACCOUNT_LOCKED') {
        endFlow(getAuthErrorMessage(caught));
        return;
      }
      setError(getAuthErrorMessage(caught));
      setCode('');
      setRecovery('');
    }
  };

  const switchMode = () => {
    setError(null);
    setMode((current) => (current === 'code' ? 'recovery' : 'code'));
  };

  const isRecovery = mode === 'recovery';

  return (
    <AuthLayout
      icon="shield"
      title={t('twoFactor.title')}
      subtitle={isRecovery ? t('twoFactor.recoverySubtitle') : t('twoFactor.subtitle')}
      onBack={goToLogin}
    >
      {isRecovery ? (
        <TextField
          label={t('twoFactor.recoveryLabel')}
          placeholder="XXXXX-XXXXX"
          value={recovery}
          onChangeText={(text) => setRecovery(formatRecoveryCode(text))}
          autoCapitalize="characters"
          autoCorrect={false}
          spellCheck={false}
          autoFocus
          returnKeyType="go"
          onSubmitEditing={() => isCompleteRecoveryCode(recovery) && void submit(recovery)}
          error={error ?? undefined}
          testID="two-factor-recovery"
        />
      ) : (
        <OtpInput
          value={code}
          onChange={setCode}
          onComplete={submit}
          onSubmit={(value) => void submit(value)}
          label={t('twoFactor.codeLabel')}
          autoFocus
          hasError={error !== null}
          testID="two-factor-otp"
        />
      )}
      {isRecovery ? null : <FormError message={error} />}
      <Button
        title={t('twoFactor.submit')}
        onPress={() => void submit(isRecovery ? recovery : code)}
        loading={verify.isPending}
        disabled={isRecovery ? !isCompleteRecoveryCode(recovery) : code.length < OTP_LENGTH}
        fullWidth
        testID="two-factor-submit"
      />
      <View style={styles.switch}>
        <Button
          title={isRecovery ? t('twoFactor.useAuthenticator') : t('twoFactor.useRecovery')}
          variant="ghost"
          onPress={switchMode}
          style={styles.centerSelf}
          testID="two-factor-switch"
        />
        {isRecovery ? (
          <AppText variant="caption" align="center">
            {t('twoFactor.recoveryHint')}
          </AppText>
        ) : null}
      </View>
    </AuthLayout>
  );
}

const useStyles = makeStyles(() => ({
  switch: { alignItems: 'center', gap: spacing.xs },
  centerSelf: { alignSelf: 'center' },
}));
