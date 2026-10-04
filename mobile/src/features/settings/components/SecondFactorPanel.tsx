import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { FormError } from '@/features/auth/components/FormError';
import { OtpInput } from '@/features/auth/components/OtpInput';
import { OTP_LENGTH, formatRecoveryCode, isCompleteRecoveryCode } from '@/features/auth/schemas';
import { useTranslation } from '@/i18n';
import { makeStyles, spacing } from '@/theme';

export type SecondFactorInput = {
  password?: string;
  code?: string;
  recoveryCode?: string;
};

type SecondFactorPanelProps = {
  title: string;
  /** Consequence of the action ("Your account will only be protected by your password."). */
  warning: string;
  confirmLabel: string;
  /** Turning 2FA off also asks for the current password. */
  needsPassword?: boolean;
  isPending: boolean;
  error: string | null;
  onSubmit: (input: SecondFactorInput) => void;
  onCancel: () => void;
};

/**
 * Inline form that proves who is asking before a sensitive 2FA action: (optional) current password
 * plus an authenticator code or a recovery code.
 */
export function SecondFactorPanel({
  title,
  warning,
  confirmLabel,
  needsPassword = false,
  isPending,
  error,
  onSubmit,
  onCancel,
}: SecondFactorPanelProps) {
  const { t } = useTranslation('settings');
  const styles = useStyles();
  const [password, setPassword] = useState('');
  const [isRecovery, setIsRecovery] = useState(false);
  const [code, setCode] = useState('');
  const [recovery, setRecovery] = useState('');

  const isFactorComplete = isRecovery
    ? isCompleteRecoveryCode(recovery)
    : code.length === OTP_LENGTH;
  const canSubmit = isFactorComplete && (!needsPassword || password.length > 0);

  const submit = () => {
    if (!canSubmit || isPending) return;
    onSubmit({
      ...(needsPassword ? { password } : {}),
      ...(isRecovery ? { recoveryCode: recovery } : { code }),
    });
  };

  return (
    <View style={styles.container} testID="second-factor-panel">
      <AppText variant="label">{title}</AppText>
      <AppText variant="body" color="textSecondary">
        {warning}
      </AppText>
      {needsPassword ? (
        <TextField
          label={t('security.disable.password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          testID="second-factor-password"
        />
      ) : null}
      {isRecovery ? (
        <TextField
          label={t('security.factor.recoveryCode')}
          placeholder="XXXXX-XXXXX"
          value={recovery}
          onChangeText={(text) => setRecovery(formatRecoveryCode(text))}
          autoCapitalize="characters"
          autoCorrect={false}
          spellCheck={false}
          testID="second-factor-recovery"
        />
      ) : (
        <View style={styles.codeField}>
          <AppText variant="label">{t('security.factor.code')}</AppText>
          <OtpInput
            value={code}
            onChange={setCode}
            label={t('security.factor.code')}
            hasError={error !== null}
            testID="second-factor-otp"
          />
        </View>
      )}
      <FormError message={error} />
      <Button
        title={isRecovery ? t('security.factor.useCode') : t('security.factor.useRecovery')}
        variant="ghost"
        size="sm"
        onPress={() => setIsRecovery((value) => !value)}
        style={styles.inlineLink}
        testID="second-factor-switch"
      />
      <View style={styles.actions}>
        <Button
          title={confirmLabel}
          onPress={submit}
          loading={isPending}
          disabled={!canSubmit}
          testID="second-factor-confirm"
        />
        <Button title={t('security.cancel')} variant="ghost" onPress={onCancel} />
      </View>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  container: { gap: spacing.md },
  codeField: { gap: spacing.sm },
  // A ghost button's label is inset by its padding: pull it back so it lines up with the text above.
  inlineLink: { marginLeft: -spacing.lg },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md },
}));
