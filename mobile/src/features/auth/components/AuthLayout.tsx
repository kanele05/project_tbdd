import Feather from '@expo/vector-icons/Feather';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { STRINGS } from '@/constants/strings';
import { colors, layout, radius, spacing } from '@/theme';

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Link row under the form ("Don't have an account? Sign up"). */
  footer: ReactNode;
};

/**
 * Shared frame of Login / Register: logo tile, title, form slot and footer link.
 * The keyboard never covers the inputs: KeyboardAvoidingView (iOS) + scrollable content, and
 * Android uses `softwareKeyboardLayoutMode: "pan"` from app.json.
 */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding">
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.xxxl, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Feather name="book-open" size={32} color={colors.textOnPrimary} />
          </View>
          <AppText variant="h3" color="primaryText" align="center">
            {STRINGS.appName}
          </AppText>
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
        <View style={styles.footer}>{footer}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, paddingHorizontal: layout.screenPaddingX },
  brand: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xxxl },
  logo: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg + 4,
    backgroundColor: colors.primary,
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
});
