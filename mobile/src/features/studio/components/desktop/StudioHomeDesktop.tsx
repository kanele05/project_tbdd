import { View } from 'react-native';

import { WorkHeader, WorkShell } from '@/components/layout/work';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { useTranslation } from '@/i18n';
import { makeStyles, spacing } from '@/theme';

import type { useStudioCourses } from '../../hooks';
import { createCourse, STATUS_FILTERS, type StatusFilter } from '../../studioHome';
import { StudioSummaryTiles } from '../StudioSummaryTiles';
import { StudioCoursesTable } from './StudioCoursesTable';

export type StudioHomeDesktopProps = {
  query: ReturnType<typeof useStudioCourses>;
  filter: StatusFilter;
  onFilterChange: (filter: StatusFilter) => void;
};

/**
 * SC-23 on a PC window: title row with the "New course" button, the three totals in one row, the
 * status filter chips and the courses as a table (cover, status, price, students, last update).
 */
export function StudioHomeDesktop({ query, filter, onFilterChange }: StudioHomeDesktopProps) {
  const { t } = useTranslation('studio');
  const styles = useStyles();
  const { summary } = query;
  return (
    <WorkShell testID="studio-desktop">
      <WorkHeader
        title={t('title')}
        subtitle={t('subtitle')}
        right={
          <Button
            title={t('newCourse')}
            leftIcon="plus"
            onPress={createCourse}
            testID="studio-new-course"
          />
        }
      />
      <View style={styles.stack}>
        {summary ? <StudioSummaryTiles summary={summary} /> : null}
        <View
          style={styles.filters}
          accessibilityRole="tablist"
          accessibilityLabel={t('desktop.filtersLabel')}
        >
          {STATUS_FILTERS.map((key) => {
            const count = key === 'all' ? summary?.courseCount : summary?.byStatus[key];
            const label = key === 'all' ? t('filter.all') : t(`status.${key}`);
            return (
              <Chip
                key={key}
                label={count === undefined ? label : `${label} (${count})`}
                selected={filter === key}
                size="sm"
                onPress={() => onFilterChange(key)}
                testID={`studio-filter-${key}`}
              />
            );
          })}
        </View>
        <StudioCoursesTable query={query} filter={filter} />
      </View>
    </WorkShell>
  );
}

const useStyles = makeStyles(() => ({
  stack: { gap: spacing.lg },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
}));
