import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CinematicHeader } from '@/components/ui/CinematicHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { getAuthErrorMessage } from '@/features/auth/authErrors';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, radius, spacing } from '@/theme';
import { goBackOr } from '@/utils/navigation';

import { TwoFactorSetupDesktop } from '../components/desktop/TwoFactorSetupDesktop';
import { RecoveryCodesView } from '../components/RecoveryCodesView';
import { ConfirmStep, QR_SIZE, ScanStep } from '../components/TwoFactorSetupSteps';
import { useEnableTwoFactor, useSetupTwoFactor } from '../hooks';

function leaveSetup(): void {
  goBackOr('/settings/security');
}

/**
 * AUTH-09 two-step verification setup: ask the server for a secret, show it as a QR code (and as
 * text for manual entry), turn 2FA on with the first code, then show the recovery codes once.
 * On a PC window the same steps sit in two columns inside the Settings frame.
 */
export function TwoFactorSetupScreen() {
  const { t } = useTranslation('settings');
  const { isWide } = useBreakpoint();
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

  const scanStep = setup.data ? (
    <ScanStep
      otpauthUrl={setup.data.otpauthUrl}
      secret={setup.data.secret}
      onCopy={(secret) => void copySecret(secret)}
    />
  ) : null;
  const confirmStep = (
    <ConfirmStep
      code={code}
      onChangeCode={setCode}
      onConfirm={(value) => void confirm(value)}
      error={error}
      isPending={enable.isPending}
    />
  );
  const isLoading = setup.isPending || setup.isIdle;

  if (isWide) {
    return (
      <TwoFactorSetupDesktop
        status={isLoading ? 'loading' : setup.isError ? 'error' : 'ready'}
        error={setup.error}
        onRetry={() => startSetup()}
        scanStep={scanStep}
        confirmStep={confirmStep}
        recoveryCodes={recoveryCodes}
        onSaved={leaveSetup}
      />
    );
  }

  if (recoveryCodes) {
    return (
      <View style={styles.screen}>
        <CinematicHeader title={t('security.recovery.title')} posterIndex={4} showBack={false} />
        <ScrollView contentContainerStyle={contentStyle} showsVerticalScrollIndicator={false}>
          <RecoveryCodesView codes={recoveryCodes} onSaved={leaveSetup} />
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
        {isLoading ? (
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
            {scanStep}
            {confirmStep}
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
  centered: { alignItems: 'center' },
}));
