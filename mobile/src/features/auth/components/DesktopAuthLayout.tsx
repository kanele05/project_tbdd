import Feather from '@expo/vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { getPageGutter } from '@/components/layout/pageGutter';
import { useHover } from '@/components/layout/useHover';
import { AppText } from '@/components/ui/AppText';
import { GlassIconButton } from '@/components/ui/GlassIconButton';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { PosterWall } from '@/components/ui/PosterWall';
import { Wordmark } from '@/components/ui/Wordmark';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslation } from '@/i18n';
import { DarkThemeScope, darkPalette, makeStyles, radius, spacing, withAlpha } from '@/theme';

import { goBack, type AuthLayoutProps } from './authLayoutShared';

/** Width of the form card (PLAN §2.5: ~440-480 dp, like Netflix's sign-in box). */
export const AUTH_CARD_WIDTH = 460;

/** Extra darkening over the poster wall: strong at the top and bottom, lighter behind the card. */
const BACKDROP = [
  withAlpha(darkPalette.scrim, 0.82),
  withAlpha(darkPalette.scrim, 0.5),
  withAlpha(darkPalette.scrim, 0.88),
] as const;

function WordmarkLink() {
  const { t } = useTranslation('auth');
  const { isHovered, hoverProps } = useHover();
  const styles = useStyles();
  return (
    <Pressable
      {...hoverProps}
      onPress={() => router.replace('/login')}
      accessibilityRole="link"
      accessibilityLabel={t('desktop.logoLink')}
      style={[styles.logo, isHovered ? styles.logoHover : null]}
      testID="auth-logo"
    >
      <Wordmark size={40} />
    </Pressable>
  );
}

/** The form card. Always the dark palette (it sits on the cinema backdrop in light mode too). */
function AuthCard({ title, subtitle, children, footer, icon, onBack }: AuthLayoutProps) {
  const { t } = useTranslation();
  const styles = useStyles();
  return (
    <GlassSurface
      radius={radius.xl}
      intensity={60}
      hasShadow
      style={styles.card}
      contentStyle={styles.cardContent}
      testID="auth-sheet"
    >
      {icon ? (
        <View style={styles.backRow}>
          <GlassIconButton
            icon="chevron-left"
            onPress={onBack ?? goBack}
            accessibilityLabel={t('actions.back')}
            testID="auth-back"
          />
        </View>
      ) : null}
      <View style={styles.heading}>
        {icon ? (
          <View style={styles.iconDisc}>
            <Feather name={icon} size={26} color={darkPalette.primary} />
          </View>
        ) : null}
        <AppText variant="h1" accessibilityRole="header">
          {title}
        </AppText>
        <AppText variant="body" color="textSecondary">
          {subtitle}
        </AppText>
      </View>
      <View style={styles.form}>{children}</View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </GlassSurface>
  );
}

/**
 * Wide-window (>= 768, web) frame of the auth screens, like Netflix's sign-in page: the course
 * poster wall full-bleed under a strong dark backdrop, the wordmark top-left (back to Login) and
 * the form in a centered frosted card. Same props as the phone layout, so every screen gets it.
 */
export function DesktopAuthLayout(props: AuthLayoutProps) {
  const styles = useStyles();
  const { width } = useBreakpoint();
  const isStep = props.icon !== undefined;
  return (
    <View style={styles.root} testID="auth-desktop">
      <PosterWall variant={isStep ? 'soft' : 'wall'} testID="auth-poster-wall" />
      <LinearGradient colors={BACKDROP} style={styles.backdrop} />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.topBar, { paddingHorizontal: getPageGutter(width) }]}>
          <WordmarkLink />
        </View>
        <View style={styles.stage}>
          <DarkThemeScope>
            <AuthCard {...props} />
          </DarkThemeScope>
        </View>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  root: { flex: 1, backgroundColor: darkPalette.background },
  flex: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFill, pointerEvents: 'none' },
  backRow: { alignSelf: 'flex-start' },
  content: { flexGrow: 1 },
  topBar: { paddingTop: spacing.xxl, paddingBottom: spacing.sm },
  logo: { alignSelf: 'flex-start', cursor: 'pointer', borderRadius: radius.button },
  logoHover: { opacity: 0.85 },
  stage: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.huge,
  },
  card: { width: '100%', maxWidth: AUTH_CARD_WIDTH },
  cardContent: { padding: spacing.xxxl, gap: spacing.xl },
  heading: { gap: spacing.sm },
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
  form: { gap: spacing.lg },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: withAlpha(darkPalette.white, 0.14),
  },
}));
