import { FlashList } from '@shopify/flash-list';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { startPendingProgressSync } from '@/features/learning/progressSync';
import { isOfflineWithoutData, OFFLINE_QUERY_ERROR } from '@/features/learning/queryStatus';
import { colors, layout, spacing } from '@/theme';
import type { MyCourseItem, MyCoursesStatus } from '@/types/api';

import { CareerBanner } from '../components/CareerBanner';
import { CourseProgressCard } from '../components/CourseProgressCard';
import { CourseProgressCardSkeleton } from '../components/CourseProgressCardSkeleton';
import { useMyCourses } from '../hooks';
import { MY_COURSES_STRINGS, MY_COURSES_TABS, parseTabParam } from '../strings';

function keyExtractor(item: MyCourseItem): string {
  return item.course.id;
}

function openSearchTab(): void {
  router.navigate('/search');
}

/**
 * SC-14 My Courses (M-19): promo banner, ALL | ON GOING | COMPLETED tabs and one progress card
 * per enrolled course. Refetches every time the screen gets focus so a lesson finished a moment
 * ago shows the new percentage. Accepts `?tab=ongoing|completed` (the Profile stats link here).
 */
export function MyCoursesScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const paramTab = parseTabParam(params.tab);
  const [tab, setTab] = useState<MyCoursesStatus>(paramTab ?? 'all');
  const [seenParamTab, setSeenParamTab] = useState(paramTab);

  // The Profile screen can navigate here while this tab is already mounted: follow its `tab` param.
  if (paramTab !== seenParamTab) {
    setSeenParamTab(paramTab);
    if (paramTab) setTab(paramTab);
  }

  const courses = useMyCourses(tab);
  const refetchRef = useRef(courses.refetch);
  useEffect(() => {
    refetchRef.current = courses.refetch;
  });

  // Progress saved while offline is synced as soon as this screen (or Learning) is opened.
  useEffect(() => {
    startPendingProgressSync();
  }, []);

  // Refetch on focus, except for the first focus (the query already loads on mount).
  const isFirstFocusRef = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocusRef.current) {
        isFirstFocusRef.current = false;
        return;
      }
      void refetchRef.current();
    }, []),
  );

  const handleTabChange = useCallback((key: MyCoursesStatus) => {
    setTab(key);
    router.setParams({ tab: key });
  }, []);

  const handleOpenCourse = useCallback((item: MyCourseItem) => {
    router.push({
      pathname: '/learn/[courseId]',
      params: {
        courseId: item.course.id,
        ...(item.lastLessonId ? { lessonId: item.lastLessonId } : {}),
      },
    });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: MyCourseItem }) => (
      <View style={styles.item}>
        <CourseProgressCard item={item} onPress={handleOpenCourse} />
      </View>
    ),
    [handleOpenCourse],
  );

  const header = useMemo(
    () => (
      <View style={styles.header}>
        <CareerBanner onPress={openSearchTab} />
        <SegmentedTabs tabs={MY_COURSES_TABS} value={tab} onChange={handleTabChange} />
      </View>
    ),
    [handleTabChange, tab],
  );

  const { refetch } = courses;
  const handleRetry = useCallback(() => void refetch(), [refetch]);
  // Only a pull-to-refresh shows the spinner (a refetch on focus stays invisible).
  const [isPulling, setIsPulling] = useState(false);
  const handlePull = useCallback(async () => {
    setIsPulling(true);
    try {
      await refetch();
    } finally {
      setIsPulling(false);
    }
  }, [refetch]);

  let empty;
  if (isOfflineWithoutData(courses)) {
    empty = <ErrorState error={OFFLINE_QUERY_ERROR} onRetry={handleRetry} />;
  } else if (courses.isPending) {
    empty = (
      <View style={styles.skeletons}>
        <CourseProgressCardSkeleton />
        <CourseProgressCardSkeleton />
        <CourseProgressCardSkeleton />
      </View>
    );
  } else if (courses.isError) {
    empty = (
      <ErrorState
        error={courses.error}
        title={MY_COURSES_STRINGS.loadFailed}
        onRetry={handleRetry}
      />
    );
  } else {
    const copy = MY_COURSES_STRINGS.empty[tab];
    empty = (
      <EmptyState
        icon="book-open"
        title={copy.title}
        message={copy.message}
        actionLabel={MY_COURSES_STRINGS.explore}
        onAction={openSearchTab}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title={MY_COURSES_STRINGS.title} showBack={false} />
      <FlashList
        testID="my-courses-list"
        data={courses.data ?? []}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        refreshing={isPulling}
        onRefresh={handlePull}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxl },
  header: {
    gap: spacing.xxl,
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  item: { paddingHorizontal: layout.screenPaddingX, paddingBottom: spacing.md },
  skeletons: { gap: spacing.md, paddingHorizontal: layout.screenPaddingX },
});
