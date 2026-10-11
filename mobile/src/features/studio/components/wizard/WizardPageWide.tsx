import { View } from 'react-native';

import { stickyBottomStyle } from '@/components/layout/work';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/features/auth/components/FormError';
import { makeStyles, spacing } from '@/theme';

import type { WizardPageProps } from './WizardPage';

const BUTTON_MIN_WIDTH = 140;

/**
 * Desktop layout of one wizard step: heading, notice, fields and error flow in the content column
 * (the screen scrolls, there is no inner ScrollView) and the Back / Next footer sticks to the bottom
 * edge of that same column, so the actions line up with the fields.
 */
export function WizardPageWide({
  title,
  hint,
  banner,
  error = null,
  children,
  backLabel,
  onBack,
  primary,
  isBusy = false,
}: WizardPageProps) {
  const styles = useStyles();
  return (
    <View style={styles.page}>
      <View style={styles.heading}>
        <AppText variant="h2" accessibilityRole="header">
          {title}
        </AppText>
        {hint ? <AppText color="textSecondary">{hint}</AppText> : null}
      </View>
      {banner}
      {children}
      <FormError message={error} />
      <View style={[styles.footer, stickyBottomStyle(0)]}>
        <Button
          title={backLabel}
          variant="secondary"
          onPress={onBack}
          disabled={isBusy}
          style={styles.button}
          testID="wizard-back"
        />
        <Button
          title={primary.title}
          onPress={primary.onPress}
          loading={primary.loading ?? isBusy}
          disabled={primary.disabled}
          style={styles.button}
          testID={primary.testID}
        />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  page: { gap: spacing.xl },
  heading: { gap: spacing.xs },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
    backgroundColor: t.colors.background,
  },
  button: { minWidth: BUTTON_MIN_WIDTH },
}));
