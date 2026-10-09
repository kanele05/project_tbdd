import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { CinematicHeader } from '@/components/ui/CinematicHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { getAuthErrorMessage } from '@/features/auth/authErrors';
import { FormError } from '@/features/auth/components/FormError';
import { OtpInput } from '@/features/auth/components/OtpInput';
import { OTP_LENGTH } from '@/features/auth/schemas';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, radius, spacing } from '@/theme';

import { QrCode } from '../components/QrCode';
import { RecoveryCodesView } from '../components/RecoveryCodesView';
import { useEnableTwoFactor, useSetupTwoFactor } from '../hooks';

const QR_SIZE = 208;

/** "JBSWY3DPEHPK3PXP" -> "JBSW Y3DP EHPK 3PXP": easier to type into an authenticator app. */
function groupSecret(secret: string): string {
  return secret.replace(/(.{4})/g, '$1 ').trim();
}

/**
 * AUTH-09 two-step verification setup: ask the server for a secret, show it as a QR code (and as
 * text for manual entry), turn 2FA on with the first code, then show the recovery codes once.
 */
export function TwoFactorSetupScreen() {
  const { t } = useTranslation('settings');
  const toast = useToast();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const contentStyle = [styles.content, { paddingBottom: insets.bottom + spacing.xxxl }];
  const { mutate: startSetup, ...setup } = useSetupTwoFactor();
  const enable = useEnableTwoFactor();
  const hasStarted = useRef(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  useEffect(() => {
    // Every call makes a NEW secret on the server: ask exactly once per visit (also in strict mode).
    if (hasStarted.current) return;
    hasStarted.current = true;
    startSetup();
  }, [startSetup]);

  const copySecret = async (secret: string) => {
    try {
      await Clipboard.setStringAsync(secret);
      toast.success(t('security.setup.copied'));
    } catch {
      toast.error(t('security.recovery.copyFailed'));
    }
  };

  const confirm = async (value: string) => {
    if (enable.isPending) return;
    setError(null);
    try {
      const result = await enable.mutateAsync({ code: value });
      setRecoveryCodes(result.recoveryCodes);
      toast.success(t('security.setup.enabled'));
    } catch (caught) {
      setError(getAuthErrorMessage(caught));
      setCode('');
    }
  };

  if (recoveryCodes) {
    return (
      <View style={styles.screen}>
        <CinematicHeader title={t('security.recovery.title')} posterIndex={4} showBack={false} />
        <ScrollView contentContainerStyle={contentStyle} showsVerticalScrollIndicator={false}>
          <RecoveryCodesView codes={recoveryCodes} onSaved={() => router.back()} />
        </ScrollView>
      </View>
    );
  }

  return (
    // The code field is at the bottom of a long page: let the keyboard push it up.
    <KeyboardAvoidingView style={styles.screen} behavior="padding" testID="two-factor-setup-screen">
      <CinematicHeader title={t('security.setup.title')} posterIndex={4} />
      <ScrollView
        contentContainerStyle={contentStyle}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        testID="two-factor-setup-scroll"
      >
        {setup.isPending || setup.isIdle ? (
          <View style={styles.centered} accessibilityLabel={t('security.setup.preparing')}>
            <Skeleton width={QR_SIZE} height={QR_SIZE} borderRadius={radius.card} />
          </View>
        ) : setup.isError ? (
          <ErrorState
            error={setup.error}
            title={t('security.setup.loadFailed')}
            onRetry={() => startSetup()}
          />
        ) : (
          <>
            <View style={styles.step}>
              <AppText variant="h3">{t('security.setup.step1Title')}</AppText>
              <AppText variant="body" color="textSecondary">
                {t('security.setup.step1Body')}
              </AppText>
              <View style={styles.centered}>
                <View style={styles.qrFrame}>
                  <QrCode
                    value={setup.data.otpauthUrl}
                    size={QR_SIZE}
                    accessibilityLabel={t('security.setup.qrLabel')}
                  />
                </View>
              </View>
              <AppText variant="label">{t('security.setup.manual')}</AppText>
              <View style={styles.secretBox}>
                <AppText
                  variant="title"
                  selectable
                  style={styles.secret}
                  testID="two-factor-secret"
                >
                  {groupSecret(setup.data.secret)}
                </AppText>
                <Button
                  title={t('security.setup.copy')}
                  variant="secondary"
                  size="sm"
                  leftIcon="copy"
                  onPress={() => void copySecret(setup.data.secret)}
                  testID="two-factor-copy-secret"
                />
              </View>
            </View>

            <View style={styles.step}>
              <AppText variant="h3">{t('security.setup.step2Title')}</AppText>
              <AppText variant="body" color="textSecondary">
                {t('security.setup.step2Body')}
              </AppText>
              <OtpInput
                value={code}
                onChange={setCode}
                onComplete={(value) => void confirm(value)}
                label={t('security.factor.code')}
                hasError={error !== null}
                testID="two-factor-setup-otp"
              />
              <FormError message={error} />
              <Button
                title={t('security.setup.confirm')}
                onPress={() => void confirm(code)}
                loading={enable.isPending}
                disabled={code.length < OTP_LENGTH}
                fullWidth
                testID="two-factor-setup-confirm"
              />
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  content: {
    gap: spacing.xxl,
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
  },
  step: { gap: spacing.md },
  centered: { alignItems: 'center' },
  // Scanners need dark-on-light with a quiet zone, whatever the theme: the frame is always white.
  qrFrame: {
    padding: spacing.md,
    borderRadius: radius.card,
    backgroundColor: t.colors.white,
  },
  secretBox: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.button,
    backgroundColor: t.colors.surface,
  },
  secret: { fontVariant: ['tabular-nums'], letterSpacing: 2 },
}));
