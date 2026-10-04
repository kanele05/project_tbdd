import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { getAuthErrorMessage } from '@/features/auth/authErrors';
import { useTranslation } from '@/i18n';
import { makeStyles, spacing } from '@/theme';
import type { SecurityOverviewDto } from '@/types/api';

import { useDisableTwoFactor, useRegenerateRecoveryCodes } from '../hooks';
import { RecoveryCodesView } from './RecoveryCodesView';
import { SecondFactorPanel, type SecondFactorInput } from './SecondFactorPanel';
import { SecurityCard } from './SecurityCard';

type Panel = 'disable' | 'regenerate' | null;

/** Recovery codes below this count get a warning: the user is close to being locked out. */
const LOW_RECOVERY_CODES = 3;

type TwoFactorCardProps = { overview: SecurityOverviewDto };

/**
 * 2FA status + actions. Off: "Turn on" opens the setup screen. On: regenerate recovery codes or
 * turn it off, each behind an inline form that asks for a code (and the password when turning off).
 */
export function TwoFactorCard({ overview }: TwoFactorCardProps) {
  const { t } = useTranslation('settings');
  const toast = useToast();
  const styles = useStyles();
  const disable = useDisableTwoFactor();
  const regenerate = useRegenerateRecoveryCodes();
  const [panel, setPanel] = useState<Panel>(null);
  const [error, setError] = useState<string | null>(null);
  const [newCodes, setNewCodes] = useState<string[] | null>(null);

  const closePanel = () => {
    setPanel(null);
    setError(null);
  };

  const submitDisable = async ({ password, code, recoveryCode }: SecondFactorInput) => {
    setError(null);
    try {
      await disable.mutateAsync({
        password: password ?? '',
        ...(recoveryCode ? { recoveryCode } : { code: code ?? '' }),
      });
      closePanel();
      toast.success(t('security.disable.success'));
    } catch (caught) {
      setError(getAuthErrorMessage(caught));
    }
  };

  const submitRegenerate = async ({ code, recoveryCode }: SecondFactorInput) => {
    setError(null);
    try {
      const result = await regenerate.mutateAsync(
        recoveryCode ? { recoveryCode } : { code: code ?? '' },
      );
      closePanel();
      setNewCodes(result.recoveryCodes);
    } catch (caught) {
      setError(getAuthErrorMessage(caught));
    }
  };

  const remaining = overview.recoveryCodesRemaining;

  if (!overview.twoFactorEnabled) {
    return (
      <SecurityCard
        icon="shield"
        title={t('security.twoFactor.title')}
        description={t('security.twoFactor.description')}
        right={
          <AppText variant="label" color="textMuted">
            {t('security.twoFactor.off')}
          </AppText>
        }
        testID="two-factor-card"
      >
        <Button
          title={t('security.twoFactor.enable')}
          leftIcon="shield"
          onPress={() => router.push('/settings/two-factor')}
          testID="two-factor-enable"
        />
      </SecurityCard>
    );
  }

  return (
    <SecurityCard
      icon="shield"
      title={t('security.twoFactor.title')}
      description={t('security.twoFactor.description')}
      right={<Badge label={t('security.twoFactor.on')} shape="pill" tone="success" />}
      testID="two-factor-card"
    >
      <AppText
        variant="body"
        color={remaining < LOW_RECOVERY_CODES ? 'dangerText' : 'textSecondary'}
        testID="recovery-remaining"
      >
        {t('security.twoFactor.recoveryRemaining', { count: remaining })}
      </AppText>
      {remaining < LOW_RECOVERY_CODES && panel === null && newCodes === null ? (
        <AppText variant="caption" color="dangerText">
          {t('security.twoFactor.lowRecovery')}
        </AppText>
      ) : null}

      {newCodes ? (
        <RecoveryCodesView codes={newCodes} onSaved={() => setNewCodes(null)} />
      ) : panel === 'disable' ? (
        <SecondFactorPanel
          title={t('security.disable.title')}
          warning={t('security.disable.warning')}
          confirmLabel={t('security.disable.confirm')}
          needsPassword
          isPending={disable.isPending}
          error={error}
          onSubmit={(input) => void submitDisable(input)}
          onCancel={closePanel}
        />
      ) : panel === 'regenerate' ? (
        <SecondFactorPanel
          title={t('security.regenerate.title')}
          warning={t('security.regenerate.warning')}
          confirmLabel={t('security.regenerate.confirm')}
          isPending={regenerate.isPending}
          error={error}
          onSubmit={(input) => void submitRegenerate(input)}
          onCancel={closePanel}
        />
      ) : (
        <View style={styles.actions}>
          <Button
            title={t('security.twoFactor.regenerate')}
            variant="secondary"
            size="sm"
            leftIcon="refresh-cw"
            onPress={() => setPanel('regenerate')}
            testID="two-factor-regenerate"
          />
          <Button
            title={t('security.twoFactor.disable')}
            variant="secondary"
            size="sm"
            leftIcon="shield-off"
            onPress={() => setPanel('disable')}
            testID="two-factor-disable"
          />
        </View>
      )}
    </SecurityCard>
  );
}

const useStyles = makeStyles(() => ({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
}));
