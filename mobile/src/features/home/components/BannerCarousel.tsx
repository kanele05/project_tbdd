import { Image } from 'expo-image';
import { useCallback, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { AppText, Button } from '@/components/ui';
import { colors, layout, radius, spacing } from '@/theme';
import type { BannerDto } from '@/types/api';

type BannerCarouselProps = {
  banners: readonly BannerDto[];
  onPressBanner: (banner: BannerDto) => void;
};

export const BANNER_HEIGHT = 156;
const GAP = spacing.md;

function keyExtractor(banner: BannerDto): string {
  return banner.id;
}

function BannerSeparator() {
  return <View style={styles.separator} />;
}

type BannerCardProps = {
  banner: BannerDto;
  width: number;
  onPress: (banner: BannerDto) => void;
};

/** One promotional banner: title, big subtitle ("20% OFF"), CTA button, cut-out image on the right. */
function BannerCard({ banner, width, onPress }: BannerCardProps) {
  return (
    <View style={[styles.card, { width, backgroundColor: banner.bgColor || colors.secondary }]}>
      <View style={styles.imageWrap} pointerEvents="none">
        <Image
          source={{ uri: banner.imageUrl }}
          style={styles.image}
          contentFit="contain"
          contentPosition={{ right: 0, bottom: 0 }}
          cachePolicy="memory-disk"
          transition={150}
          accessibilityIgnoresInvertColors
        />
      </View>
      <View style={styles.texts}>
        <AppText variant="body" color="white" uppercase numberOfLines={2}>
          {banner.title}
        </AppText>
        {banner.subtitle ? (
          <AppText variant="h1" color="white" numberOfLines={1}>
            {banner.subtitle}
          </AppText>
        ) : null}
        <Button
          title={banner.ctaText}
          size="sm"
          uppercase
          labelFamily="body"
          onPress={() => onPress(banner)}
          accessibilityLabel={`${banner.ctaText}, ${banner.title}`}
          style={styles.cta}
        />
      </View>
    </View>
  );
}

/** Horizontal paging banners (SC-04); dots appear when there is more than one banner. */
export function BannerCarousel({ banners, onPressBanner }: BannerCarouselProps) {
  const { width: windowWidth } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const cardWidth = windowWidth - 2 * layout.screenPaddingX;

  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / (cardWidth + GAP));
      setActiveIndex(Math.max(0, Math.min(index, banners.length - 1)));
    },
    [cardWidth, banners.length],
  );

  const renderItem = useCallback(
    ({ item }: { item: BannerDto }) => (
      <BannerCard banner={item} width={cardWidth} onPress={onPressBanner} />
    ),
    [cardWidth, onPressBanner],
  );

  return (
    <View>
      <FlatList
        horizontal
        data={banners}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ItemSeparatorComponent={BannerSeparator}
        snapToInterval={cardWidth + GAP}
        snapToAlignment="start"
        decelerationRate="fast"
        onMomentumScrollEnd={handleScrollEnd}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      />
      {banners.length > 1 ? (
        <View
          style={styles.dots}
          accessible
          accessibilityLabel={`Banner ${activeIndex + 1} of ${banners.length}`}
        >
          {banners.map((banner, index) => (
            <View
              key={banner.id}
              style={[styles.dot, index === activeIndex ? styles.dotActive : null]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: layout.screenPaddingX },
  separator: { width: GAP },
  // Design: 20 dp above the title, 8 dp between title / "20% OFF" / button, 16 dp from the left.
  card: {
    minHeight: BANNER_HEIGHT,
    overflow: 'hidden',
    borderRadius: radius.badge,
  },
  texts: { width: '58%', gap: spacing.sm, paddingTop: spacing.xl, paddingLeft: spacing.lg },
  // "JOIN NOW" button: 96 dp wide = 12 dp padding around a 72 dp label.
  cta: { paddingHorizontal: spacing.md },
  imageWrap: { position: 'absolute', top: 0, right: 0, bottom: 0, width: '45%' },
  image: { width: '100%', height: '100%' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.sm },
  dot: { width: 6, height: 6, borderRadius: radius.pill, backgroundColor: colors.border },
  dotActive: { width: 16, backgroundColor: colors.primary },
});
