import { StyleSheet, View } from 'react-native';

import { CourseCardVerticalSkeleton } from '@/components/course';
import { Skeleton } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { layout, radius, spacing } from '@/theme';

/** Loading placeholder of the Home sections below the hero: topic chips and two poster rails. */
export function HomeSkeleton() {
  const { t } = useTranslation();
  return (
    <View
      style={styles.content}
      accessible
      accessibilityLabel={t('loading')}
      accessibilityState={{ busy: true }}
    >
      <View style={styles.chips}>
        {[96, 84, 112, 92].map((width, index) => (
          <Skeleton key={index} width={width} height={48} borderRadius={radius.pill} />
        ))}
      </View>
      {[0, 1].map((index) => (
        <View key={index} style={styles.section}>
          <View style={styles.titleRow}>
            <Skeleton width={180} height={24} />
            <Skeleton width={64} height={16} />
          </View>
          <View style={styles.cards}>
            <CourseCardVerticalSkeleton />
            <CourseCardVerticalSkeleton />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: layout.sectionGap },
  chips: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
    paddingHorizontal: layout.screenPaddingX,
    overflow: 'hidden',
  },
  section: { gap: spacing.md },
  titleRow: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPaddingX,
  },
  cards: {
    flexDirection: 'row',
    gap: layout.railGap,
    paddingHorizontal: layout.screenPaddingX,
    overflow: 'hidden',
  },
});
