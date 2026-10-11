import { useMemo, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CourseCardDesktopSkeleton } from '@/components/course';
import { DESKTOP_NAV_HEIGHT } from '@/components/layout/desktopLayout';
import { PageContainer } from '@/components/layout/PageContainer';
import { ResponsiveGrid } from '@/components/layout/ResponsiveGrid';
import { AppText, Skeleton, type SegmentedTab } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { radius, spacing } from '@/theme';
import type { MyCourseItem, MyCoursesStatus } from '@/types/api';

import { CareerBanner } from './CareerBanner';
import { ContinueHero } from './ContinueHero';
import { MyCoursesPillTabs } from './MyCoursesPillTabs';
import { MyCoursesStats } from './MyCoursesStats';
import { OwnedCourseCard } from './OwnedCourseCard';

export type MyCoursesDesktopViewProps = {
  tabs: readonly SegmentedTab<MyCoursesStatus>[];
  tab: MyCoursesStatus;
  onChangeTab: (tab: MyCoursesStatus) => void;
  /** `undefined` while nothing has loaded yet. */
  items: readonly MyCourseItem[] | undefined;
  /** Error / empty message shown instead of the grid (computed by the screen). */
  message: ReactNode;
  isLoading: boolean;
  /** Resume learning (hero button, card click). Keep stable (`useCallback`). */
  onOpenItem: (item: MyCourseItem) => void;
  /** Open the course page (hero "Course details"). Keep stable (`useCallback`). */
  onOpenDetails: (item: MyCourseItem) => void;
  onExplore: () => void;
};

const GRID_MIN_ITEM_WIDTH = 240;
const SKELETON_COUNT = 10;
const HERO_SKELETON_HEIGHT = 280;

/**
 * My Courses on wide screens (PLAN §2.5), "continue watching" style: title + stat chips, the
 * "Continue learning" hero, pill tabs, a grid of compact progress cards and the career banner. All
 * blocks share the `PageContainer` gutters so their edges line up.
 */
export function MyCoursesDesktopView({
  tabs,
  tab,
  onChangeTab,
  items,
  message,
  isLoading,
  onOpenItem,
  onOpenDetails,
  onExplore,
}: MyCoursesDesktopViewProps) {
  const { t } = useTranslation('myCourses');
  const hasItems = (items?.length ?? 0) > 0;
  // The newest unfinished course (the list is newest first); the Completed tab has none.
  const heroItem = useMemo(
    () => (tab === 'completed' ? undefined : items?.find((item) => item.progressPercent < 100)),
    [items, tab],
  );

  let body: ReactNode = message;
  if (isLoading) {
    body = (
      <ResponsiveGrid minItemWidth={GRID_MIN_ITEM_WIDTH}>
        {Array.from({ length: SKELETON_COUNT }, (_, index) => (
          <CourseCardDesktopSkeleton key={index} />
        ))}
      </ResponsiveGrid>
    );
  } else if (hasItems && items) {
    body = (
      <ResponsiveGrid minItemWidth={GRID_MIN_ITEM_WIDTH} testID="my-courses-grid">
        {items.map((item) => (
          <OwnedCourseCard key={item.course.id} item={item} onOpen={onOpenItem} />
        ))}
      </ResponsiveGrid>
    );
  }

  return (
    <ScrollView
      testID="my-courses-list"
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <PageContainer>
        <View style={styles.header}>
          <AppText variant="h1" accessibilityRole="header">
            {t('title')}
          </AppText>
          <MyCoursesStats />
        </View>
        {isLoading && tab !== 'completed' ? (
          <Skeleton height={HERO_SKELETON_HEIGHT} borderRadius={radius.xl} style={styles.section} />
        ) : null}
        {heroItem ? (
          <View style={styles.section}>
            <ContinueHero item={heroItem} onContinue={onOpenItem} onOpenDetails={onOpenDetails} />
          </View>
        ) : null}
        <View style={styles.section}>
          <MyCoursesPillTabs tabs={tabs} value={tab} onChange={onChangeTab} />
        </View>
        <View style={styles.body}>{body}</View>
        {hasItems ? (
          <View style={styles.footer}>
            <CareerBanner onPress={onExplore} />
          </View>
        ) : null}
      </PageContainer>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: DESKTOP_NAV_HEIGHT + spacing.xl, paddingBottom: spacing.huge },
  header: { gap: spacing.md },
  section: { marginTop: spacing.xxl },
  body: { marginTop: spacing.xl },
  footer: { marginTop: spacing.huge },
});
