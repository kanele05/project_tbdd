import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/features/auth/components/FormError';
import { OtpInput } from '@/features/auth/components/OtpInput';
import { OTP_LENGTH } from '@/features/auth/schemas';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing } from '@/theme';

import { QrCode } from './QrCode';

export const QR_SIZE = 208;

/** "JBSWY3DPEHPK3PXP" -> "JBSW Y3DP EHPK 3PXP": easier to type into an authenticator app. */
function groupSecret(secret: string): string {
  return secret.replace(/(.{4})/g, '$1 ').trim();
}

export type ScanStepProps = {
  otpauthUrl: string;
  secret: string;
  onCopy: (secret: string) => void;
};

/** Step 1 of the two-step setup: the QR code and the key as text for manual entry. */
export function ScanStep({ otpauthUrl, secret, onCopy }: ScanStepProps) {
  const { t } = useTranslation('settings');
  const styles = useStyles();
  return (
    <View style={styles.step}>
      <AppText variant="h3">{t('security.setup.step1Title')}</AppText>
      <AppText variant="body" color="textSecondary">
        {t('security.setup.step1Body')}
      </AppText>
      <View style={styles.centered}>
        <View style={styles.qrFrame}>
          <QrCode
            value={otpauthUrl}
            size={QR_SIZE}
            accessibilityLabel={t('security.setup.qrLabel')}
          />
        </View>
      </View>
      <AppText variant="label">{t('security.setup.manual')}</AppText>
      <View style={styles.secretBox}>
        <AppText variant="title" selectable style={styles.secret} testID="two-factor-secret">
          {groupSecret(secret)}
        </AppText>
        <Button
          title={t('security.setup.copy')}
          variant="secondary"
          size="sm"
          leftIcon="copy"
          onPress={() => onCopy(secret)}
          testID="two-factor-copy-secret"
        />
      </View>
    </View>
  );
}

export type ConfirmStepProps = {
  code: string;
  onChangeCode: (code: string) => void;
  onConfirm: (code: string) => void;
  error: string | null;
  isPending: boolean;
};

/** Step 2 of the two-step setup: the first 6-digit code turns the verification on. */
export function ConfirmStep({ code, onChangeCode, onConfirm, error, isPending }: ConfirmStepProps) {
  const { t } = useTranslation('settings');
  const styles = useStyles();
  return (
    <View style={styles.step}>
      <AppText variant="h3">{t('security.setup.step2Title')}</AppText>
      <AppText variant="body" color="textSecondary">
        {t('security.setup.step2Body')}
      </AppText>
      <OtpInput
        value={code}
        onChange={onChangeCode}
        onComplete={onConfirm}
        label={t('security.factor.code')}
        hasError={error !== null}
        testID="two-factor-setup-otp"
      />
      <FormError message={error} />
      <Button
        title={t('security.setup.confirm')}
        onPress={() => onConfirm(code)}
        loading={isPending}
        disabled={code.length < OTP_LENGTH}
        fullWidth
        testID="two-factor-setup-confirm"
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
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
