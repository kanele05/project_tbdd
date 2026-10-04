import { useCallback, useState, type ReactNode } from 'react';
import {
  FlatList,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Badge, Button, HeroImage, Skeleton } from '@/components/ui';
import { MAX_CONTENT_WIDTH } from '@/constants/config';
import { useTranslation } from '@/i18n';
import { darkPalette, layout, radius, spacing, useTheme, withAlpha } from '@/theme';

export const HOME_HERO_HEIGHT = 520;

/** One page of the hero: a full-bleed photo with a tag, a serif title and one neon button. */
export type HeroSlide = {
  id: string;
  imageUrl: string;
  /** Short gold tag above the title ("20% OFF"). */
  tag: string | null;
  title: string;
  ctaLabel: string;
  ctaAccessibilityLabel: string;
  backgroundColor?: string;
  onPress: () => void;
};

type HomeHeroProps = {
  slides: readonly HeroSlide[];
  /** Greeting row drawn over the photo; stays put while the pages swipe. */
  topBar: ReactNode;
};

function keyExtractor(slide: HeroSlide): string {
  return slide.id;
}

function SlideView({
  slide,
  width,
  isPaged,
}: {
  slide: HeroSlide;
  width: number;
  isPaged: boolean;
}) {
  return (
    <View style={{ width }}>
      <HeroImage
        uri={slide.imageUrl}
        height={HOME_HERO_HEIGHT}
        style={slide.backgroundColor ? { backgroundColor: slide.backgroundColor } : undefined}
        contentStyle={isPaged ? styles.pagedContent : undefined}
      >
        {slide.tag ? <Badge label={slide.tag} tone="gold" /> : null}
        <AppText variant="hero" color="white" numberOfLines={4}>
          {slide.title}
        </AppText>
        <Button
          title={slide.ctaLabel}
          rightIcon="arrow-right"
          onPress={slide.onPress}
          accessibilityLabel={slide.ctaAccessibilityLabel}
          style={styles.cta}
        />
      </HeroImage>
    </View>
  );
}

/** Position dots of the pager (decorative: the group announces "Featured 1 of 3"). */
function Dots({ count, activeIndex }: { count: number; activeIndex: number }) {
  const { t } = useTranslation('home');
  return (
    <View
      style={styles.dots}
      accessible
      accessibilityLabel={t('hero.position', { current: activeIndex + 1, total: count })}
    >
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={[styles.dot, index === activeIndex ? styles.dotActive : null]} />
      ))}
    </View>
  );
}

/** Wrapper that puts the greeting row over the photo, below the status bar. */
function TopBarOverlay({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>{children}</View>;
}

/**
 * The first thing on Home (concept B): the server banners as full-bleed hero pages (swipe
 * sideways), the greeting + cart + bell floating on top.
 */
export function HomeHero({ slides, topBar }: HomeHeroProps) {
  const { width: windowWidth } = useWindowDimensions();
  // `onLayout` gives the real column width (web caps the app at `MAX_CONTENT_WIDTH`).
  const [width, setWidth] = useState(Math.min(windowWidth, MAX_CONTENT_WIDTH));
  const [activeIndex, setActiveIndex] = useState(0);
  const isPaged = slides.length > 1;

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    if (next > 0) setWidth(next);
  }, []);
  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / width);
      setActiveIndex(Math.max(0, Math.min(index, slides.length - 1)));
    },
    [width, slides.length],
  );
  const renderItem = useCallback(
    ({ item }: { item: HeroSlide }) => <SlideView slide={item} width={width} isPaged={isPaged} />,
    [width, isPaged],
  );
  const getItemLayout = useCallback(
    (_: ArrayLike<HeroSlide> | null | undefined, index: number) => ({
      length: width,
      offset: width * index,
      index,
    }),
    [width],
  );

  return (
    <View onLayout={handleLayout}>
      <FlatList
        horizontal
        pagingEnabled
        data={slides}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        onMomentumScrollEnd={handleScrollEnd}
        showsHorizontalScrollIndicator={false}
        scrollEnabled={isPaged}
      />
      {isPaged ? <Dots count={slides.length} activeIndex={activeIndex} /> : null}
      <TopBarOverlay>{topBar}</TopBarOverlay>
    </View>
  );
}

/** Loading placeholder of the hero: same height as the photo, the greeting row on top. */
export function HomeHeroSkeleton({ topBar }: { topBar: ReactNode }) {
  const { isDark } = useTheme();
  return (
    <View>
      <Skeleton
        height={HOME_HERO_HEIGHT}
        borderRadius={0}
        style={isDark ? undefined : styles.skeletonRounded}
      />
      <TopBarOverlay>{topBar}</TopBarOverlay>
    </View>
  );
}

const styles = StyleSheet.create({
  pagedContent: { paddingBottom: spacing.huge },
  cta: { alignSelf: 'flex-start' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: layout.screenPaddingX,
  },
  dots: {
    position: 'absolute',
    bottom: spacing.lg,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
  },
  dot: {
    width: 6,
    height: 4,
    borderRadius: 2,
    backgroundColor: withAlpha(darkPalette.white, 0.45),
  },
  dotActive: { width: 26, backgroundColor: darkPalette.primary },
  skeletonRounded: { borderBottomLeftRadius: radius.sheet, borderBottomRightRadius: radius.sheet },
});
