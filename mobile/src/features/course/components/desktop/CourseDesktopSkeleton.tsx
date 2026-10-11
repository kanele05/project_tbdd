import { View } from 'react-native';

import { PageContainer } from '@/components/layout/PageContainer';
import { Skeleton } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing } from '@/theme';

const HERO_HEIGHT = 520;
const SIDE_WIDTH = 380;

/** Loading placeholder of the PC course page: hero block, tabs column and purchase card. */
export function CourseDesktopSkeleton() {
  const { t } = useTranslation('course');
  const styles = useStyles();
  return (
    <View testID="course-detail-skeleton" accessibilityLabel={t('loading')}>
      <Skeleton height={HERO_HEIGHT} borderRadius={0} />
      <PageContainer style={styles.columns}>
        <View style={styles.main}>
          <Skeleton height={56} />
          <Skeleton height={48} />
          <Skeleton height={14} />
          <Skeleton height={14} />
          <Skeleton width="80%" height={14} />
        </View>
        <View style={styles.side}>
          <Skeleton height={320} borderRadius={radius.card} />
        </View>
      </PageContainer>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  columns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xxxl,
    paddingTop: spacing.xxxl,
  },
  main: { flex: 1, gap: spacing.md },
  side: { width: SIDE_WIDTH },
}));
