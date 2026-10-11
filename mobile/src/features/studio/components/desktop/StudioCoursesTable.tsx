import { useCallback, useMemo } from 'react';
import { View } from 'react-native';

import {
  TableCard,
  TableHeaderRow,
  TableLoadMore,
  type TableColumn,
} from '@/components/layout/work';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { isOfflineWithoutData, OFFLINE_QUERY_ERROR } from '@/features/learning/queryStatus';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslation } from '@/i18n';
import type { StudioCourseSummaryDto } from '@/types/api';

import { StudioCourseRow, StudioCourseRowSkeleton, type StudioColumns } from './StudioCourseRow';
import type { useStudioCourses } from '../../hooks';
import { createCourse, openCourse, type StatusFilter } from '../../studioHome';

export type StudioCoursesTableProps = {
  query: ReturnType<typeof useStudioCourses>;
  filter: StatusFilter;
};

/** Courses of the teacher as a table: loading rows, error, empty (all / filtered) and the data rows. */
export function StudioCoursesTable({ query, filter }: StudioCoursesTableProps) {
  const { t } = useTranslation('studio');
  const { isDesktop } = useBreakpoint();
  const { courses, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = query;

  const columns = useMemo<StudioColumns>(
    () => ({
      course: { key: 'course', label: t('desktop.table.course'), flex: 3 },
      status: { key: 'status', label: t('desktop.table.status'), width: 190 },
      price: { key: 'price', label: t('desktop.table.price'), width: 90 },
      students: { key: 'students', label: t('desktop.table.students'), width: 90 },
      updated: isDesktop
        ? { key: 'updated', label: t('desktop.table.updated'), width: 130 }
        : undefined,
    }),
    [isDesktop, t],
  );
  const headerColumns = useMemo(
    () => Object.values(columns).filter((column): column is TableColumn => column !== undefined),
    [columns],
  );
  const handleRetry = useCallback(() => void refetch(), [refetch]);
  const handleOpen = useCallback((course: StudioCourseSummaryDto) => openCourse(course), []);
  const handleMore = useCallback(() => void fetchNextPage(), [fetchNextPage]);

  if (courses.length === 0) {
    if (isOfflineWithoutData(query)) {
      return <ErrorState error={OFFLINE_QUERY_ERROR} onRetry={handleRetry} />;
    }
    if (query.isPending) {
      return (
        <TableCard testID="studio-table-skeleton">
          <TableHeaderRow columns={headerColumns} />
          <StudioCourseRowSkeleton isLast={false} />
          <StudioCourseRowSkeleton isLast={false} />
          <StudioCourseRowSkeleton isLast />
        </TableCard>
      );
    }
    if (query.isError) {
      return <ErrorState error={query.error} title={t('loadFailed')} onRetry={handleRetry} />;
    }
    return filter === 'all' ? (
      <EmptyState
        icon="edit-3"
        title={t('empty.title')}
        message={t('empty.message')}
        actionLabel={t('newCourse')}
        onAction={createCourse}
      />
    ) : (
      <EmptyState
        icon="filter"
        title={t('empty.filteredTitle')}
        message={t('empty.filteredMessage', { status: t(`status.${filter}`) })}
      />
    );
  }

  return (
    <View testID="studio-course-list">
      <TableCard>
        <TableHeaderRow columns={headerColumns} />
        {courses.map((course, index) => (
          <StudioCourseRow
            key={course.id}
            course={course}
            columns={columns}
            isLast={index === courses.length - 1}
            onPress={handleOpen}
          />
        ))}
      </TableCard>
      <TableLoadMore
        hasMore={hasNextPage}
        isLoading={isFetchingNextPage}
        onPress={handleMore}
        testID="studio-load-more"
      />
    </View>
  );
}
