import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { showToast } from '@/components/ui/Toast';
import { flattenPages } from '@/features/learning/pages';
import { isOfflineWithoutData, OFFLINE_QUERY_ERROR } from '@/features/learning/queryStatus';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, spacing, useTheme } from '@/theme';
import type { TeacherSubmissionDto } from '@/types/api';

import type { SubmissionFilter } from '../api';
import { GradeSheet } from '../components/GradeSheet';
import { SubmissionRow, SubmissionRowSkeleton } from '../components/SubmissionRow';
import { useCourseSubmissions } from '../hooks';

export type TeacherSubmissionsScreenProps = { courseId: string };

const FILTERS: readonly SubmissionFilter[] = ['all', 'ungraded', 'graded'];

function keyExtractor(submission: TeacherSubmissionDto): string {
  return submission.id;
}

/**
 * SC-29 Submissions of one course (teacher): a paginated list with a graded / to-grade filter and
 * a grade sheet (0-100 + feedback, BR-26). Loading, error (Retry), empty and success are all handled.
 */
export function TeacherSubmissionsScreen({ courseId }: TeacherSubmissionsScreenProps) {
  const { t } = useTranslation('teaching');
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<SubmissionFilter>('all');
  const [gradeTarget, setGradeTarget] = useState<TeacherSubmissionDto | null>(null);
  const query = useCourseSubmissions(courseId, filter);
  const { hasNextPage, isFetchingNextPage, fetchNextPage, refetch } = query;

  const items = useMemo(() => flattenPages(query.data?.pages), [query.data]);
  const summary = query.data?.pages[0]?.meta.summary;

  const handleOpenFile = useCallback(
    (url: string) => {
      Linking.openURL(url).catch(() => showToast(t('submissions.openFailed'), { type: 'error' }));
    },
    [t],
  );
  const handleCloseSheet = useCallback(() => setGradeTarget(null), []);
  const handleRetry = useCallback(() => void refetch(), [refetch]);
  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<TeacherSubmissionDto>) => (
      <View style={styles.item}>
        <SubmissionRow submission={item} onGrade={setGradeTarget} onOpenFile={handleOpenFile} />
      </View>
    ),
    [handleOpenFile, styles],
  );

  const header = (
    <View style={styles.header}>
      {summary ? (
        <AppText variant="caption" accessibilityLiveRegion="polite">
          {t('submissions.summary', {
            graded: summary.gradedCount,
            ungraded: summary.ungradedCount,
          })}
        </AppText>
      ) : null}
      <View style={styles.chips}>
        {FILTERS.map((value) => (
          <Chip
            key={value}
            label={t(`submissions.filter.${value}`)}
            selected={filter === value}
            size="sm"
            onPress={() => setFilter(value)}
            testID={`submission-filter-${value}`}
          />
        ))}
      </View>
    </View>
  );

  let empty;
  if (isOfflineWithoutData(query)) {
    empty = <ErrorState error={OFFLINE_QUERY_ERROR} onRetry={handleRetry} />;
  } else if (query.isPending) {
    empty = (
      <View style={styles.skeletons}>
        <SubmissionRowSkeleton />
        <SubmissionRowSkeleton />
        <SubmissionRowSkeleton />
      </View>
    );
  } else if (query.isError) {
    empty = (
      <ErrorState error={query.error} title={t('submissions.loadFailed')} onRetry={handleRetry} />
    );
  } else {
    empty = (
      <EmptyState
        icon="inbox"
        title={t(`submissions.empty.${filter}Title`)}
        message={t(`submissions.empty.${filter}Message`)}
      />
    );
  }

  return (
    <View style={styles.screen} testID="teacher-submissions-screen">
      <ScreenHeader title={t('submissions.title')} />
      <FlashList
        testID="submissions-list"
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator style={styles.footer} color={colors.primaryText} />
          ) : null
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        refreshing={query.isRefetching && !isFetchingNextPage}
        onRefresh={handleRetry}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        showsVerticalScrollIndicator={false}
      />
      <GradeSheet submission={gradeTarget} courseId={courseId} onClose={handleCloseSheet} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  header: { gap: spacing.md, paddingHorizontal: layout.screenPaddingX, paddingBottom: spacing.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  item: { paddingHorizontal: layout.screenPaddingX, paddingBottom: spacing.md },
  skeletons: { gap: spacing.md, paddingHorizontal: layout.screenPaddingX },
  footer: { paddingVertical: spacing.lg },
}));
