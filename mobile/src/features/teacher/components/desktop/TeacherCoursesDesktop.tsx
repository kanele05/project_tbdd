import { useCallback } from 'react';
import { Pressable, View } from 'react-native';

import {
  CourseCardDesktop,
  CourseCardDesktopSkeleton,
  type DesktopCardCourse,
} from '@/components/course';
import { ResponsiveGrid } from '@/components/layout/ResponsiveGrid';
import { AppText, Badge } from '@/components/ui';
import { useQuickCardActions } from '@/features/search/useQuickCardActions';
import { useTranslation } from '@/i18n';
import { makeStyles, spacing } from '@/theme';
import type { CourseSummary, TeacherCoursesGroupDto } from '@/types/api';

import { TeacherTabState } from '../TeacherTabState';

export type TeacherCoursesDesktopProps = {
  groups: readonly TeacherCoursesGroupDto[] | undefined;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  onToggleBookmark: (course: CourseSummary) => void;
  /** "View all" -> SC-08 filtered by this teacher + this category. */
  onViewAll: (categoryId: string) => void;
};

const GRID_MIN_ITEM_WIDTH = 260;
const GRID_MAX_COLUMNS = 5;
const SKELETON_KEYS = ['a', 'b', 'c', 'd'] as const;

/**
 * COURSES tab of the PC teacher profile: one block per category (name, "Top-rated" badge, "View
 * all") with the courses as hover cards in a responsive grid.
 */
export function TeacherCoursesDesktop({
  groups,
  isPending,
  isError,
  error,
  onRetry,
  onToggleBookmark,
  onViewAll,
}: TeacherCoursesDesktopProps) {
  const { t } = useTranslation(['teacher', 'common']);
  const styles = useStyles();
  const { onPress, onAddToCart } = useQuickCardActions();

  const handleToggleBookmark = useCallback(
    (card: DesktopCardCourse) => {
      const course = groups?.flatMap((group) => group.courses).find((item) => item.id === card.id);
      if (course) onToggleBookmark(course);
    },
    [groups, onToggleBookmark],
  );

  if (isPending && !groups) {
    return (
      <View testID="teacher-courses-skeleton">
        <ResponsiveGrid minItemWidth={GRID_MIN_ITEM_WIDTH} maxColumns={GRID_MAX_COLUMNS}>
          {SKELETON_KEYS.map((key) => (
            <CourseCardDesktopSkeleton key={key} />
          ))}
        </ResponsiveGrid>
      </View>
    );
  }
  if (isError || !groups || groups.length === 0) {
    return (
      <TeacherTabState
        tab="courses"
        isPending={false}
        isError={isError}
        error={error}
        onRetry={onRetry}
      />
    );
  }
  return (
    <View style={styles.groups} testID="teacher-courses-desktop">
      {groups.map((group) => (
        <View key={group.category.id} style={styles.group}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <AppText variant="h2" accessibilityRole="header" numberOfLines={1}>
                {group.category.name}
              </AppText>
              {group.isTopRated ? <Badge label={t('teacher:topRated')} shape="pill" /> : null}
            </View>
            <Pressable
              onPress={() => onViewAll(group.category.id)}
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              accessibilityRole="link"
              accessibilityLabel={t('teacher:viewAllIn', { category: group.category.name })}
            >
              <AppText variant="label" color="primaryText">
                {t('common:actions.viewAll')}
              </AppText>
            </Pressable>
          </View>
          <ResponsiveGrid
            minItemWidth={GRID_MIN_ITEM_WIDTH}
            maxColumns={GRID_MAX_COLUMNS}
            liftOnHover
          >
            {group.courses.map((course) => (
              <CourseCardDesktop
                key={course.id}
                course={course}
                onPress={onPress}
                onToggleBookmark={handleToggleBookmark}
                onAddToCart={onAddToCart}
              />
            ))}
          </ResponsiveGrid>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles(() => ({
  groups: { gap: spacing.huge },
  group: { gap: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
}));
