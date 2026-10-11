import { FlashList } from '@shopify/flash-list';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTabBarClearance } from '@/components/FloatingTabBar';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { startPendingProgressSync } from '@/features/learning/progressSync';
import { isOfflineWithoutData, OFFLINE_QUERY_ERROR } from '@/features/learning/queryStatus';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, spacing } from '@/theme';
import type { MyCourseItem, MyCoursesStatus } from '@/types/api';

import { CareerBanner } from '../components/CareerBanner';
import { ContinueCard } from '../components/ContinueCard';
import { CourseProgressCard } from '../components/CourseProgressCard';
import { CourseProgressCardSkeleton } from '../components/CourseProgressCardSkeleton';
import { MyCoursesDesktopView } from '../components/MyCoursesDesktopView';
import { useMyCourses } from '../hooks';
import { MY_COURSES_TAB_KEYS, parseTabParam } from '../tabs';

function keyExtractor(item: MyCourseItem): string {
  return item.course.id;
}

function openSearchTab(): void {
  router.navigate('/search');
}

/**
 * SC-14 My Courses (M-19), concept B: a big serif title, the course you studied last as a
 * "Continue learning" poster, the All | On going | Completed tabs and one progress card per course,
 * ending with the career banner. Refetches every time the screen gets focus so a lesson finished a
 * moment ago shows the new percentage. Accepts `?tab=ongoing|completed` (Profile stats link here).
 */
export function MyCoursesScreen() {
  const { t } = useTranslation('myCourses');
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const clearance = useTabBarClearance();
  const { isWide } = useBreakpoint();
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
    [handleOpenCourse, styles],
  );

  const items = courses.data;
  // The latest unfinished course is promoted to the poster, so it is not repeated in the list.
  const continueItem = useMemo(
    () => (tab === 'completed' ? undefined : items?.find((item) => item.progressPercent < 100)),
    [items, tab],
  );
  const listItems = useMemo(
    () => (continueItem ? (items ?? []).filter((item) => item !== continueItem) : (items ?? [])),
    [continueItem, items],
  );

  const tabs = useMemo(
    () => MY_COURSES_TAB_KEYS.map((key) => ({ key, label: t(`tabs.${key}`) })),
    [t],
  );
  const header = useMemo(
    () => (
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.titleBlock}>
          <AppText variant="h1" accessibilityRole="header">
            {t('title')}
          </AppText>
          {items ? (
            <AppText variant="caption">{t('subtitle', { count: items.length })}</AppText>
          ) : null}
        </View>
        {continueItem ? (
          <View style={styles.section}>
            <AppText variant="h2" accessibilityRole="header">
              {t('continue.title')}
            </AppText>
            <ContinueCard item={continueItem} onPress={handleOpenCourse} />
          </View>
        ) : null}
        <SegmentedTabs tabs={tabs} value={tab} onChange={handleTabChange} />
      </View>
    ),
    [continueItem, handleOpenCourse, handleTabChange, insets.top, items, styles, t, tab, tabs],
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

  let empty = null;
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
    empty = <ErrorState error={courses.error} title={t('loadFailed')} onRetry={handleRetry} />;
  } else if (!continueItem) {
    empty = (
      <EmptyState
        icon="book-open"
        title={t(`empty.${tab}.title`)}
        message={t(`empty.${tab}.message`)}
        actionLabel={t('explore')}
        onAction={openSearchTab}
      />
    );
  }

  if (isWide) {
    let message: ReactNode = null;
    if (isOfflineWithoutData(courses)) {
      message = <ErrorState error={OFFLINE_QUERY_ERROR} onRetry={handleRetry} />;
    } else if (courses.isError && !items) {
      message = <ErrorState error={courses.error} title={t('loadFailed')} onRetry={handleRetry} />;
    } else if (items && items.length === 0) {
      message = (
        <EmptyState
          icon="book-open"
          title={t(`empty.${tab}.title`)}
          message={t(`empty.${tab}.message`)}
          actionLabel={t('explore')}
          onAction={openSearchTab}
        />
      );
    }
    return (
      <MyCoursesDesktopView
        tabs={tabs}
        tab={tab}
        onChangeTab={handleTabChange}
        items={items}
        message={message}
        isLoading={courses.isPending && !isOfflineWithoutData(courses)}
        onOpenItem={handleOpenCourse}
        onExplore={openSearchTab}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <FlashList
        testID="my-courses-list"
        data={listItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={
          items && items.length > 0 ? (
            <View style={styles.footer}>
              <CareerBanner onPress={openSearchTab} />
            </View>
          ) : null
        }
        refreshing={isPulling}
        onRefresh={handlePull}
        contentContainerStyle={{ paddingBottom: clearance + spacing.xxxl }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  header: {
    gap: layout.sectionGap - spacing.sm,
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: spacing.lg,
  },
  titleBlock: { gap: spacing.xs },
  section: { gap: spacing.md },
  item: { paddingHorizontal: layout.screenPaddingX, paddingBottom: spacing.md },
  skeletons: { gap: spacing.md, paddingHorizontal: layout.screenPaddingX },
  footer: { paddingHorizontal: layout.screenPaddingX, paddingTop: spacing.lg },
}));
