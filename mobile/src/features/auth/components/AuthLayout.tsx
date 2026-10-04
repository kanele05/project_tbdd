import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';
import type { FeatherIconName } from '@/components/ui/icons';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, radius, spacing, useTheme } from '@/theme';

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Link row under the form ("Don't have an account? Sign up"). */
  footer?: ReactNode;
  /**
   * Icon of the step screens (verify email, 2FA, forgot / reset password): replaces the brand mark
   * with a tinted icon disc and adds a back button.
   */
  icon?: FeatherIconName;
  /** Custom back handler (default: previous screen, or Login when there is no history). */
  onBack?: () => void;
};

function goBack(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/login');
}

/**
 * Shared frame of the auth screens: logo tile (or step icon), title, form slot and footer link.
 * The keyboard never covers the inputs: KeyboardAvoidingView (iOS) + scrollable content, and
 * Android uses `softwareKeyboardLayoutMode: "resize"` from app.json.
 */
export function AuthLayout({ title, subtitle, children, footer, icon, onBack }: AuthLayoutProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const isStep = icon !== undefined;
  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding">
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + (isStep ? spacing.sm : spacing.xxxl),
            paddingBottom: insets.bottom + spacing.xxl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {isStep ? (
          <View style={styles.backRow}>
            <IconButton
              icon="chevron-left"
              onPress={onBack ?? goBack}
              accessibilityLabel={t('actions.back')}
              color="textSecondary"
              testID="auth-back"
            />
          </View>
        ) : null}
        <View style={styles.brand}>
          {isStep ? (
            <View style={styles.iconDisc}>
              <Feather name={icon} size={30} color={colors.primaryText} />
            </View>
          ) : (
            <>
              <View style={styles.logo}>
                <Feather name="book-open" size={32} color={colors.onPrimary} />
              </View>
              <AppText variant="h2" family="displayItalic" align="center">
                {t('appName')}
              </AppText>
            </>
          )}
        </View>
        <View style={styles.heading}>
          <AppText variant="h1" accessibilityRole="header">
            {title}
          </AppText>
          <AppText variant="body" color="textSecondary">
            {subtitle}
          </AppText>
        </View>
        <View style={styles.form}>{children}</View>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1, backgroundColor: t.colors.background },
  content: { flexGrow: 1, paddingHorizontal: layout.screenPaddingX },
  backRow: { marginLeft: -spacing.md, marginBottom: spacing.sm },
  brand: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xxxl },
  logo: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg + 4,
    backgroundColor: t.colors.primary,
  },
  iconDisc: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: t.colors.primarySoft,
  },
  heading: { gap: spacing.xs, marginBottom: spacing.xxl },
  form: { gap: spacing.lg },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xxl,
  },
}));
