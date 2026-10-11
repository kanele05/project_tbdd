import { router } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import { WorkPanel } from '@/components/layout/work';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslation } from '@/i18n';
import { makeStyles, spacing } from '@/theme';
import type { TeacherCourseStatsDto } from '@/types/api';

import { EnrollmentsChart } from './EnrollmentsChart';
import { RatingDistribution } from './RatingDistribution';
import { StatsKpis } from './StatsKpis';

export type StatsBodyWideProps = { stats: TeacherCourseStatsDto; courseId: string };

/**
 * SC-28 on a PC window: the four KPI tiles in one row, then the 30-day chart next to the star
 * distribution, then the project grading summary. On a tablet the two chart panels stack.
 */
export function StatsBodyWide({ stats, courseId }: StatsBodyWideProps) {
  const { t } = useTranslation('teaching');
  const { isDesktop } = useBreakpoint();
  const styles = useStyles();
  const newStudents = stats.newEnrollments30d.reduce((sum, day) => sum + day.count, 0);
  const handleOpenSubmissions = useCallback(() => {
    router.push(`/studio/${courseId}/submissions`);
  }, [courseId]);

  return (
    <View style={styles.page} testID="stats-desktop">
      <View style={styles.kpis}>
        <StatsKpis stats={stats} tileStyle={styles.tile} />
      </View>
      <View style={isDesktop ? styles.pair : styles.stack}>
        <WorkPanel title={t('stats.chart.title')} style={isDesktop ? styles.chartPanel : null}>
          <AppText variant="caption">{t('stats.chart.total', { count: newStudents })}</AppText>
          <EnrollmentsChart days={stats.newEnrollments30d} />
        </WorkPanel>
        <WorkPanel
          title={t('stats.distribution.title')}
          style={isDesktop ? styles.distributionPanel : null}
        >
          <RatingDistribution distribution={stats.ratingDistribution} />
        </WorkPanel>
      </View>
      <WorkPanel title={t('stats.projects.title')}>
        <AppText variant="body" color="textSecondary">
          {t('stats.projects.value', { graded: stats.gradedCount, total: stats.submissionCount })}
        </AppText>
        <View style={styles.action}>
          <Button
            title={t('stats.projects.open')}
            variant="outline"
            size="sm"
            rightIcon="chevron-right"
            onPress={handleOpenSubmissions}
            testID="open-submissions"
          />
        </View>
      </WorkPanel>
    </View>
  );
}

const TILE_BASIS = 220;

const useStyles = makeStyles(() => ({
  page: { gap: spacing.xl },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  // Four tiles fit one row from ~1000 dp; narrower windows wrap to 2 + 2.
  tile: { flexBasis: TILE_BASIS, flexGrow: 1, minWidth: 0 },
  pair: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.xl },
  stack: { gap: spacing.xl },
  chartPanel: { flex: 3, minWidth: 0 },
  distributionPanel: { flex: 2, minWidth: 0 },
  action: { alignItems: 'flex-start' },
}));
