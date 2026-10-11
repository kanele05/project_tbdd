import Feather from '@expo/vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, withTiming } from 'react-native-reanimated';

import { useHover } from '@/components/layout/useHover';
import { AppText } from '@/components/ui/AppText';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslation } from '@/i18n';
import { DarkThemeScope, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';

import { BannerGlow, TrendArt } from './BannerArt';

export type CareerBannerProps = {
  onPress: () => void;
};

const ARROW_NUDGE = 5;
const NUDGE_MS = 160;

type BannerCtaProps = { title: string; onPress: () => void };

/** Neon pill; on hover (web) the arrow nudges to the right. */
function BannerCta({ title, onPress }: BannerCtaProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const isReducedMotion = useReducedMotion();
  const { isHovered, hoverProps } = useHover();
  const arrowStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: withTiming(isHovered && !isReducedMotion ? ARROW_NUDGE : 0, {
          duration: NUDGE_MS,
        }),
      },
    ],
  }));
  return (
    <Pressable
      {...hoverProps}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      testID="career-banner-cta"
      style={({ pressed }) => [
        styles.cta,
        isHovered ? styles.ctaHover : null,
        pressed ? styles.ctaPressed : null,
      ]}
    >
      <AppText variant="label" family="bodyBold" color="onPrimary">
        {title}
      </AppText>
      <Animated.View style={arrowStyle}>
        <Feather name="arrow-right" size={18} color={colors.onPrimary} />
      </Animated.View>
    </Pressable>
  );
}

function BannerBody({ onPress }: CareerBannerProps) {
  const { t } = useTranslation('myCourses');
  const { isWide } = useBreakpoint();
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={[styles.banner, isWide ? styles.bannerWide : null]} testID="career-banner">
      <BannerGlow size={isWide ? 420 : 280} />
      <LinearGradient
        colors={[withAlpha(colors.primary, 0.1), withAlpha(colors.primary, 0)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.texts}>
        <AppText variant="micro" color="primaryText" uppercase style={styles.kicker}>
          {t('bannerKicker')}
        </AppText>
        <AppText variant={isWide ? 'h1' : 'h3'} accessibilityRole="header">
          {t('bannerTitle')}
        </AppText>
        <BannerCta title={t('bannerAction')} onPress={onPress} />
      </View>
      <TrendArt width={isWide ? 280 : 104} height={isWide ? 124 : 48} />
    </View>
  );
}

/**
 * Promo block at the end of My Courses ("Courses that boost your career!" + "Explore now" ->
 * Search). Always dark (Noir), also in light mode: a drifting accent glow, a trend line that draws
 * itself in a loop and an arrow that nudges on hover. Reduce Motion freezes it on a finished frame.
 */
export function CareerBanner(props: CareerBannerProps) {
  return (
    <DarkThemeScope>
      <BannerBody {...props} />
    </DarkThemeScope>
  );
}

const useStyles = makeStyles((t) => ({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    overflow: 'hidden',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
  },
  bannerWide: { gap: spacing.xxxl, paddingVertical: spacing.xxxl, paddingHorizontal: spacing.huge },
  texts: { flex: 1, gap: spacing.md, alignItems: 'flex-start' },
  kicker: { letterSpacing: 1.2 },
  cta: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: t.colors.primary,
    cursor: 'pointer',
  },
  ctaHover: { backgroundColor: t.colors.primaryPressed },
  ctaPressed: { opacity: 0.85 },
}));
