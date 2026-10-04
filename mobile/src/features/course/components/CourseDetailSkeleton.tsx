import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { layout, radius, spacing } from '@/theme';

const HERO_HEIGHT = 480;

/** Loading placeholder of SC-09 (hero, teacher row, facts, tabs and a few content lines). */
export function CourseDetailSkeleton() {
  const { t } = useTranslation('course');
  return (
    <View testID="course-detail-skeleton" accessibilityLabel={t('loading')}>
      <Skeleton height={HERO_HEIGHT} borderRadius={0} />
      <View style={styles.teacherRow}>
        <Skeleton width={52} height={52} borderRadius={radius.pill} />
        <View style={styles.teacherTexts}>
          <Skeleton width="50%" height={16} />
          <Skeleton width="35%" height={12} />
        </View>
        <Skeleton width={96} height={40} borderRadius={radius.pill} />
      </View>
      <View style={styles.body}>
        <Skeleton height={72} />
        <Skeleton height={48} style={styles.tabs} />
        <Skeleton height={14} />
        <Skeleton height={14} />
        <Skeleton width="80%" height={14} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  teacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.screenPaddingX,
    paddingVertical: spacing.xl,
  },
  teacherTexts: { flex: 1, gap: spacing.sm },
  body: { paddingHorizontal: layout.screenPaddingX, gap: spacing.md },
  tabs: { marginVertical: spacing.sm },
});
