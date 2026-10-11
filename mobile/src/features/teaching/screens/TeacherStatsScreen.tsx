import { router } from 'expo-router';
import { useCallback } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { isOfflineWithoutData, OFFLINE_QUERY_ERROR } from '@/features/learning/queryStatus';
import { useTranslation } from '@/i18n';
import { formatFixed, formatNumber } from '@/i18n/format';
import { layout, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { TeacherCourseStatsDto } from '@/types/api';
import { formatPrice } from '@/utils/formatPrice';

import { EnrollmentsChart } from '../components/EnrollmentsChart';
import { RatingDistribution } from '../components/RatingDistribution';
import { StatTile } from '../components/StatTile';
import { useCourseStats } from '../hooks';

export type TeacherStatsScreenProps = { courseId: string };

function StatsSkeleton() {
  const styles = useStyles();
  return (
    <View style={styles.body} testID="stats-skeleton">
      <View style={styles.tiles}>
        <Skeleton height={96} borderRadius={radius.card} style={styles.skeletonTile} />
        <Skeleton height={96} borderRadius={radius.card} style={styles.skeletonTile} />
        <Skeleton height={96} borderRadius={radius.card} style={styles.skeletonTile} />
        <Skeleton height={96} borderRadius={radius.card} style={styles.skeletonTile} />
      </View>
      <Skeleton height={140} borderRadius={radius.card} />
      <Skeleton height={160} borderRadius={radius.card} />
    </View>
  );
}

function StatsBody({ stats, courseId }: { stats: TeacherCourseStatsDto; courseId: string }) {
  const { t } = useTranslation('teaching');
  const styles = useStyles();
  const newStudents = stats.newEnrollments30d.reduce((sum, day) => sum + day.count, 0);
  const handleOpenSubmissions = useCallback(() => {
    router.push(`/studio/${courseId}/submissions`);
  }, [courseId]);

  return (
    <View style={styles.body}>
      <View style={styles.tiles}>
        <StatTile
          label={t('stats.kpi.students')}
          value={formatNumber(stats.enrollmentCount)}
          note={t('stats.kpi.completed', { count: stats.completedCount })}
          testID="kpi-students"
        />
        <StatTile
          label={t('stats.kpi.revenue')}
          value={formatPrice(stats.revenueCents)}
          note={t('stats.kpi.revenueNote')}
          testID="kpi-revenue"
        />
        <StatTile
          label={t('stats.kpi.avgProgress')}
          value={`${formatNumber(stats.avgProgressPercent)}%`}
          testID="kpi-progress"
        />
        <StatTile
          label={t('stats.kpi.rating')}
          value={
            stats.ratingCount > 0
              ? t('stats.kpi.ratingValue', { rating: formatFixed(stats.ratingAvg, 1) })
              : '-'
          }
          note={
            stats.ratingCount > 0
              ? t('stats.kpi.reviews', { count: stats.ratingCount })
              : t('stats.kpi.noRating')
          }
          testID="kpi-rating"
        />
      </View>

      <View style={styles.section}>
        <AppText variant="h3" accessibilityRole="header">
          {t('stats.chart.title')}
        </AppText>
        <AppText variant="caption">{t('stats.chart.total', { count: newStudents })}</AppText>
        <EnrollmentsChart days={stats.newEnrollments30d} />
      </View>

      <View style={styles.section}>
        <AppText variant="h3" accessibilityRole="header">
          {t('stats.distribution.title')}
        </AppText>
        <RatingDistribution distribution={stats.ratingDistribution} />
      </View>

      <View style={styles.section}>
        <AppText variant="h3" accessibilityRole="header">
          {t('stats.projects.title')}
        </AppText>
        <AppText variant="body" color="textSecondary">
          {t('stats.projects.value', { graded: stats.gradedCount, total: stats.submissionCount })}
        </AppText>
        <Button
          title={t('stats.projects.open')}
          variant="outline"
          size="sm"
          rightIcon="chevron-right"
          onPress={handleOpenSubmissions}
          testID="open-submissions"
        />
      </View>
    </View>
  );
}

/**
 * SC-28 Course statistics (teacher): KPI tiles, the 30-day new-student chart, the star
 * distribution and a shortcut to the submissions. Pull to refresh; loading / error / success.
 */
export function TeacherStatsScreen({ courseId }: TeacherStatsScreenProps) {
  const { t } = useTranslation('teaching');
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const query = useCourseStats(courseId);
  const { refetch } = query;
  const handleRetry = useCallback(() => void refetch(), [refetch]);

  let body;
  if (query.data) {
    body = <StatsBody stats={query.data} courseId={courseId} />;
  } else if (isOfflineWithoutData(query)) {
    body = <ErrorState error={OFFLINE_QUERY_ERROR} onRetry={handleRetry} />;
  } else if (query.isError) {
    body = <ErrorState error={query.error} title={t('stats.loadFailed')} onRetry={handleRetry} />;
  } else {
    body = <StatsSkeleton />;
  }

  return (
    <View style={styles.screen} testID="teacher-stats-screen">
      <ScreenHeader title={t('stats.title')} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={handleRetry}
            colors={[colors.primary]}
            tintColor={colors.primaryText}
          />
        }
      >
        {body}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  body: { gap: spacing.xxl, padding: layout.screenPaddingX },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  skeletonTile: { flexGrow: 1, flexBasis: '45%' },
  section: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
  },
}));
