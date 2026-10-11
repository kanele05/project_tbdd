import Feather from '@expo/vector-icons/Feather';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { GlassIconButton } from '@/components/ui/GlassIconButton';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { PosterWall } from '@/components/ui/PosterWall';
import { Wordmark } from '@/components/ui/Wordmark';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslation } from '@/i18n';
import { darkPalette, layout, makeStyles, radius, spacing, withAlpha } from '@/theme';

import { goBack, type AuthLayoutProps } from './authLayoutShared';
import { DesktopAuthLayout } from './DesktopAuthLayout';

/**
 * Shared frame of the auth screens. Below 768 dp it is the phone layout (`PhoneAuthLayout`); on a
 * wide window (web, PLAN §2.5) it is the Netflix-style centered card (`DesktopAuthLayout`).
 */
export function AuthLayout(props: AuthLayoutProps) {
  const { isWide } = useBreakpoint();
  return isWide ? <DesktopAuthLayout {...props} /> : <PhoneAuthLayout {...props} />;
}

/**
 * Phone frame of the auth screens, "cinematic" like a streaming app's sign-in: a tilted wall of
 * course posters drifting behind a dark scrim, the wordmark on top, a serif tagline (sign in / sign
 * up) or the step title (OTP, 2FA, forgot / reset password) in white, and the form on a frosted
 * glass sheet. The keyboard never covers the inputs: KeyboardAvoidingView (iOS) + scrollable
 * content, and Android uses `softwareKeyboardLayoutMode: "resize"` from app.json.
 */
function PhoneAuthLayout({ title, subtitle, children, footer, icon, onBack }: AuthLayoutProps) {
  const { t } = useTranslation();
  const { t: tAuth } = useTranslation('auth');
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const isStep = icon !== undefined;
  const [tagLead, tagTail] = tAuth('tagline').split('\n');
  return (
    <View style={styles.root}>
      <PosterWall variant={isStep ? 'soft' : 'wall'} testID="auth-poster-wall" />
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topRow}>
            {isStep ? (
              <GlassIconButton
                icon="chevron-left"
                onPress={onBack ?? goBack}
                accessibilityLabel={t('actions.back')}
                testID="auth-back"
              />
            ) : null}
            <Wordmark size={32} />
          </View>

          <View style={styles.hero}>
            {isStep ? (
              <>
                <View style={styles.iconDisc}>
                  <Feather name={icon} size={26} color={darkPalette.primary} />
                </View>
                <AppText
                  variant="h1"
                  color="white"
                  accessibilityRole="header"
                  style={styles.onPhoto}
                >
                  {title}
                </AppText>
                <AppText variant="body" style={[styles.onPhoto, styles.softWhite]}>
                  {subtitle}
                </AppText>
              </>
            ) : (
              <>
                <View accessible accessibilityLabel={tAuth('tagline').replace('\n', ' ')}>
                  <AppText
                    variant="hero"
                    color="white"
                    style={styles.onPhoto}
                    importantForAccessibility="no"
                  >
                    {tagLead}
                  </AppText>
                  <AppText
                    variant="hero"
                    family="displayItalic"
                    style={[styles.onPhoto, styles.neon]}
                    importantForAccessibility="no"
                  >
                    {tagTail}
                  </AppText>
                </View>
                <AppText variant="body" style={[styles.onPhoto, styles.softWhite]}>
                  {tAuth('taglineSubtitle')}
                </AppText>
              </>
            )}
          </View>

          <GlassSurface
            radius={radius.sheet}
            intensity={60}
            hasShadow
            contentStyle={styles.sheet}
            testID="auth-sheet"
          >
            {isStep ? null : (
              <View style={styles.heading}>
                <AppText variant="h2" accessibilityRole="header">
                  {title}
                </AppText>
                <AppText variant="body" color="textSecondary">
                  {subtitle}
                </AppText>
              </View>
            )}
            <View style={styles.form}>{children}</View>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </GlassSurface>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  root: { flex: 1, backgroundColor: darkPalette.background },
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: spacing.md },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    minHeight: layout.minTouchTarget,
  },
  hero: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xl,
  },
  // White on photography is only legal over the scrim: a soft shadow keeps it readable on top of it.
  onPhoto: {
    textShadowColor: 'rgba(0, 0, 0, 0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 14,
  },
  softWhite: { color: withAlpha(darkPalette.white, 0.9) },
  neon: { color: darkPalette.primary },
  iconDisc: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: withAlpha(darkPalette.primary, 0.45),
    backgroundColor: withAlpha(darkPalette.primary, 0.14),
  },
  sheet: { padding: spacing.xl, gap: spacing.lg },
  heading: { gap: spacing.xs },
  form: { gap: spacing.lg },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
}));
