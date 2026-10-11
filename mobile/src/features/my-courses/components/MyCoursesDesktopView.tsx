import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CourseCardDesktopSkeleton } from '@/components/course';
import { DESKTOP_NAV_HEIGHT } from '@/components/layout/desktopLayout';
import { PageContainer } from '@/components/layout/PageContainer';
import { ResponsiveGrid } from '@/components/layout/ResponsiveGrid';
import { AppText, SegmentedTabs, type SegmentedTab } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { spacing } from '@/theme';
import type { MyCourseItem, MyCoursesStatus } from '@/types/api';

import { CareerBanner } from './CareerBanner';
import { OwnedCourseCard } from './OwnedCourseCard';

export type MyCoursesDesktopViewProps = {
  tabs: readonly SegmentedTab<MyCoursesStatus>[];
  tab: MyCoursesStatus;
  onChangeTab: (tab: MyCoursesStatus) => void;
  /** `undefined` while nothing has loaded yet. */
  items: readonly MyCourseItem[] | undefined;
  /** Error / empty / loading message shown instead of the grid (computed by the screen). */
  message: ReactNode;
  isLoading: boolean;
  onOpenItem: (item: MyCourseItem) => void;
  onExplore: () => void;
};

const GRID_MIN_ITEM_WIDTH = 260;
const SKELETON_COUNT = 6;
const TABS_MAX_WIDTH = 480;

/**
 * My Courses on wide screens (PLAN §2.5): the title, the All | On going | Completed tabs and the
 * student's courses as a poster grid with progress; the career banner closes the page.
 */
export function MyCoursesDesktopView({
  tabs,
  tab,
  onChangeTab,
  items,
  message,
  isLoading,
  onOpenItem,
  onExplore,
}: MyCoursesDesktopViewProps) {
  const { t } = useTranslation('myCourses');
  const hasItems = (items?.length ?? 0) > 0;

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
      <ResponsiveGrid minItemWidth={GRID_MIN_ITEM_WIDTH} liftOnHover testID="my-courses-grid">
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
          {items ? (
            <AppText variant="caption">{t('subtitle', { count: items.length })}</AppText>
          ) : null}
        </View>
        <SegmentedTabs tabs={tabs} value={tab} onChange={onChangeTab} style={styles.tabs} />
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
  header: { gap: spacing.xs, marginBottom: spacing.xl },
  tabs: { maxWidth: TABS_MAX_WIDTH },
  body: { marginTop: spacing.xl },
  footer: { marginTop: spacing.huge },
});
