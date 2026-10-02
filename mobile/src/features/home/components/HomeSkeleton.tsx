import { StyleSheet, View } from 'react-native';

import { CourseCardHorizontalSkeleton, CourseCardVerticalSkeleton } from '@/components/course';
import { Skeleton } from '@/components/ui';
import { layout, radius, spacing } from '@/theme';

import { BANNER_HEIGHT } from './BannerCarousel';
import { useCategoryTileWidth } from './CategoryGrid';

function SectionTitleSkeleton() {
  return (
    <View style={styles.titleRow}>
      <Skeleton width={140} height={24} />
      <Skeleton width={64} height={16} />
    </View>
  );
}

/** Loading placeholder with the shape of the Home content: banner, categories, cards. */
export function HomeSkeleton() {
  const tileWidth = useCategoryTileWidth();
  return (
    <View style={styles.content} accessibilityLabel="Loading" accessibilityState={{ busy: true }}>
      <View style={styles.padded}>
        <Skeleton height={BANNER_HEIGHT} borderRadius={radius.badge} />
      </View>

      <View style={styles.section}>
        <SectionTitleSkeleton />
        <View style={styles.grid}>
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} width={tileWidth} height={60} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionTitleSkeleton />
        <View style={styles.cardsRow}>
          <CourseCardVerticalSkeleton />
          <CourseCardVerticalSkeleton />
        </View>
      </View>

      <View style={styles.section}>
        <SectionTitleSkeleton />
        <View style={styles.list}>
          <CourseCardHorizontalSkeleton />
          <CourseCardHorizontalSkeleton />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xxxl },
  padded: { paddingHorizontal: layout.screenPaddingX },
  section: { gap: spacing.lg, paddingHorizontal: layout.screenPaddingX },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  cardsRow: { flexDirection: 'row', gap: spacing.md, overflow: 'hidden' },
  list: { gap: spacing.xl },
});
