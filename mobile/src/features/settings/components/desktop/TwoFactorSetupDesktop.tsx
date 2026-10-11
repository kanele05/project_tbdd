import type { ReactNode } from 'react';
import { View } from 'react-native';

import { WorkPanel } from '@/components/layout/work';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing } from '@/theme';

import { RecoveryCodesView } from '../RecoveryCodesView';
import { QR_SIZE } from '../TwoFactorSetupSteps';
import { SettingsDesktopShell } from './SettingsDesktopShell';

export type TwoFactorSetupDesktopProps = {
  status: 'loading' | 'error' | 'ready';
  error: unknown;
  onRetry: () => void;
  /** Step 1: QR code + key. */
  scanStep: ReactNode;
  /** Step 2: the confirmation code. */
  confirmStep: ReactNode;
  /** Set once 2FA is on: the recovery codes replace the steps. */
  recoveryCodes: string[] | null;
  onSaved: () => void;
};

/**
 * Two-step setup on a PC window: inside the Settings frame, the QR code and key on the left and
 * the code field on the right (stacked on a tablet). The recovery codes then fill the panel, the
 * explanation on the left and the codes on the right.
 */
export function TwoFactorSetupDesktop({
  status,
  error,
  onRetry,
  scanStep,
  confirmStep,
  recoveryCodes,
  onSaved,
}: TwoFactorSetupDesktopProps) {
  const { t } = useTranslation('settings');
  const { isDesktop } = useBreakpoint();
  const styles = useStyles();

  if (recoveryCodes) {
    return (
      <SettingsDesktopShell active="security" title={t('security.recovery.title')}>
        <WorkPanel testID="two-factor-recovery-panel">
          <RecoveryCodesView codes={recoveryCodes} onSaved={onSaved} isSplit={isDesktop} />
        </WorkPanel>
      </SettingsDesktopShell>
    );
  }

  let body: ReactNode;
  if (status === 'loading') {
    body = (
      <View style={styles.centered} accessibilityLabel={t('security.setup.preparing')}>
        <Skeleton width={QR_SIZE} height={QR_SIZE} borderRadius={radius.card} />
      </View>
    );
  } else if (status === 'error') {
    body = <ErrorState error={error} title={t('security.setup.loadFailed')} onRetry={onRetry} />;
  } else {
    body = (
      <View style={isDesktop ? styles.columns : styles.stack} testID="two-factor-setup-columns">
        <WorkPanel style={styles.column}>{scanStep}</WorkPanel>
        <WorkPanel style={styles.column}>{confirmStep}</WorkPanel>
      </View>
    );
  }
  return (
    <SettingsDesktopShell
      active="security"
      hasBack
      title={t('security.setup.title')}
      subtitle={t('desktop.setupHint')}
    >
      <View testID="two-factor-setup-screen">{body}</View>
    </SettingsDesktopShell>
  );
}

const useStyles = makeStyles(() => ({
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xl },
  stack: { gap: spacing.xl },
  column: { flex: 1, minWidth: 0 },
  centered: { alignItems: 'center', padding: spacing.xxl },
}));
