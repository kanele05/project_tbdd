import { View } from 'react-native';

import { CourseCardDesktopSkeleton } from '@/components/course';
import { getRailMetrics } from '@/components/layout/pageGutter';
import { Skeleton } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { layout, spacing } from '@/theme';

type HomeDesktopSkeletonProps = {
  width: number;
  /** Number of placeholder rows (default 2). */
  rows?: number;
};

/** Loading placeholder of the desktop card rows: titled rows of card skeletons. */
export function HomeDesktopSkeleton({ width, rows = 2 }: HomeDesktopSkeletonProps) {
  const { t } = useTranslation();
  const { gutter, itemWidth, visible } = getRailMetrics(width, layout.railGap);
  return (
    <View
      style={{ gap: spacing.xxxl }}
      accessible
      accessibilityLabel={t('loading')}
      accessibilityState={{ busy: true }}
    >
      {Array.from({ length: rows }, (_, row) => (
        <View key={row} style={{ gap: spacing.md, paddingHorizontal: gutter }}>
          <Skeleton width={200} height={26} />
          <View style={{ flexDirection: 'row', gap: layout.railGap, overflow: 'hidden' }}>
            {Array.from({ length: visible }, (_, index) => (
              <CourseCardDesktopSkeleton key={index} width={itemWidth} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
