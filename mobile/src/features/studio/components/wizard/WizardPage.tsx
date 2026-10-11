import { type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/features/auth/components/FormError';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { layout, makeStyles, spacing } from '@/theme';

import { WizardPageWide } from './WizardPageWide';

export type WizardAction = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  testID: string;
};

export type WizardPageProps = {
  /** Step title (+ one-line hint) shown above the fields. */
  title: string;
  hint?: string;
  /** Mode notice (published / locked) shown above the fields. */
  banner?: ReactNode;
  /** Save / submit error shown under the fields. */
  error?: string | null;
  children: ReactNode;
  /** Footer: `Back` goes one step back (or leaves the wizard on the first step). */
  backLabel: string;
  onBack: () => void;
  primary: WizardAction;
  isBusy?: boolean;
};

/**
 * Layout of one wizard step: a scrolling single column (keyboard-safe taps) and a footer with
 * Back and the primary action, sitting above the bottom safe-area inset. On a wide window the
 * screen scrolls instead and the page is laid out by `WizardPageWide`.
 */
export function WizardPage(props: WizardPageProps) {
  const { title, hint, banner, error = null, children, backLabel, onBack, primary } = props;
  const isBusy = props.isBusy ?? false;
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { isWide } = useBreakpoint();
  if (isWide) return <WizardPageWide {...props} />;
  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <AppText variant="h2" accessibilityRole="header">
            {title}
          </AppText>
          {hint ? <AppText color="textSecondary">{hint}</AppText> : null}
        </View>
        {banner}
        {children}
        <FormError message={error} />
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button
          title={backLabel}
          variant="secondary"
          onPress={onBack}
          disabled={isBusy}
          style={styles.back}
          testID="wizard-back"
        />
        <Button
          title={primary.title}
          onPress={primary.onPress}
          loading={primary.loading ?? isBusy}
          disabled={primary.disabled}
          style={styles.primary}
          testID={primary.testID}
        />
      </View>
    </>
  );
}

const useStyles = makeStyles((t) => ({
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  heading: { gap: spacing.xs },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
    backgroundColor: t.colors.background,
  },
  back: { flex: 1 },
  primary: { flex: 2 },
}));
