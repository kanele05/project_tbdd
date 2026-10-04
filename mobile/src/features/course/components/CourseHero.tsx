import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { AppText, Badge, GlassIconButton, HeroImage } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { formatNumber } from '@/i18n/format';
import { layout, makeStyles, shadows, spacing, useTheme, withAlpha } from '@/theme';

export type CourseHeroProps = {
  imageUrl: string;
  title: string;
  /** Gold tag above the title: "Best-seller · Design". */
  tag: string | null;
  ratingAvg: number;
  ratingCount: number;
  /** Hides the play button when the course has no preview lesson. */
  canPlayPreview: boolean;
  onPlayPreview: () => void;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  isLiked: boolean;
  onToggleLike: () => void;
  onShare: () => void;
};

const HERO_HEIGHT = 480;
/** Titles longer than this drop from the 38 dp hero size to 28 dp so they stay within 3 lines. */
const LONG_TITLE_LENGTH = 34;
const PLAY_CORE = 68;
const PLAY_RING = 92;

function goBack(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

type PlayProps = { onPress: () => void };

/** Neon play button in a translucent ring, with the "Watch the preview" label under it. */
function PlayPreview({ onPress }: PlayProps) {
  const { t } = useTranslation('course');
  const { colors, isDark } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.playWrap}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t('hero.playPreview')}
        hitSlop={4}
        style={({ pressed }) => [styles.playRing, pressed ? styles.pressed : null]}
      >
        <View
          style={[
            styles.playCore,
            { backgroundColor: colors.primary },
            isDark ? shadows.glow : null,
          ]}
        >
          <Ionicons name="play" size={26} color={colors.onPrimary} style={styles.playIcon} />
        </View>
      </Pressable>
      <AppText variant="label" color="white">
        {t('hero.previewLabel')}
      </AppText>
    </View>
  );
}

/**
 * Hero of SC-09 (concept B): full-bleed photo with glass back / share / like / save buttons, a neon
 * preview button, a gold tag, the serif title and the rating line - all white on the scrim.
 */
function CourseHeroBase({
  imageUrl,
  title,
  tag,
  ratingAvg,
  ratingCount,
  canPlayPreview,
  onPlayPreview,
  isBookmarked,
  onToggleBookmark,
  isLiked,
  onToggleLike,
  onShare,
}: CourseHeroProps) {
  const { t } = useTranslation(['course', 'common']);
  const { colors } = useTheme();
  const styles = useStyles();
  const ratingText = formatNumber(ratingAvg, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const isLong = title.length > LONG_TITLE_LENGTH;

  return (
    <View>
      <HeroImage
        uri={imageUrl}
        height={HERO_HEIGHT}
        testID="course-hero"
        top={
          <>
            <GlassIconButton
              icon="chevron-left"
              accessibilityLabel={t('common:actions.back')}
              onPress={goBack}
            />
            <View style={styles.actions}>
              <GlassIconButton
                icon="share-2"
                accessibilityLabel={t('course:hero.share')}
                onPress={onShare}
              />
              <GlassIconButton
                icon="heart"
                accessibilityLabel={isLiked ? t('course:hero.unlike') : t('course:hero.like')}
                isActive={isLiked}
                onPress={onToggleLike}
              />
              <GlassIconButton
                icon="bookmark"
                accessibilityLabel={
                  isBookmarked ? t('common:bookmark.remove') : t('common:bookmark.save')
                }
                isActive={isBookmarked}
                onPress={onToggleBookmark}
              />
            </View>
          </>
        }
      >
        {tag ? <Badge label={tag} tone="gold" /> : null}
        <AppText
          variant={isLong ? 'h1' : 'hero'}
          color="white"
          numberOfLines={3}
          accessibilityRole="header"
        >
          {title}
        </AppText>
        <View style={styles.meta} accessible accessibilityLabel={`${ratingText} (${ratingCount})`}>
          <Ionicons name="star" size={15} color={colors.star} />
          <AppText variant="caption" color="white" family="bodySemiBold">
            {ratingText}
          </AppText>
          <AppText variant="caption" style={{ color: withAlpha(colors.white, 0.88) }}>
            {`(${formatNumber(ratingCount)})`}
          </AppText>
        </View>
      </HeroImage>
      {canPlayPreview ? <PlayPreview onPress={onPlayPreview} /> : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  playWrap: {
    position: 'absolute',
    top: 128,
    left: layout.screenPaddingX,
    right: layout.screenPaddingX,
    alignItems: 'center',
    gap: spacing.sm,
    // Only the button takes touches: the rest of the strip lets the photo / top buttons through.
    pointerEvents: 'box-none',
  },
  playRing: {
    width: PLAY_RING,
    height: PLAY_RING,
    borderRadius: PLAY_RING / 2,
    borderWidth: 1,
    borderColor: withAlpha(t.colors.white, 0.45),
    backgroundColor: withAlpha(t.colors.scrim, 0.35),
    alignItems: 'center',
    justifyContent: 'center',
  },
  playCore: {
    width: PLAY_CORE,
    height: PLAY_CORE,
    borderRadius: PLAY_CORE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { marginLeft: 3 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
}));

export const CourseHero = memo(CourseHeroBase);
