import { memo, useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { CourseCardVertical } from '@/components/course/CourseCardVertical';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { STRINGS } from '@/constants/strings';
import { layout, spacing } from '@/theme';
import type { CourseSummary, TeacherCoursesGroupDto } from '@/types/api';

export type TeacherCourseGroupProps = {
  group: TeacherCoursesGroupDto;
  onPressCourse: (course: CourseSummary) => void;
  onToggleBookmark: (course: CourseSummary) => void;
  /** "View all" -> SC-08 filtered by this teacher + this category. */
  onViewAll: (categoryId: string) => void;
};

/** Design: cards are 205 dp wide with a 16 dp gap (wider than the Home carousel's 196). */
const COURSE_CARD_WIDTH = 205;
const keyExtractor = (course: CourseSummary): string => course.id;
const Separator = () => <View style={styles.separator} />;

/**
 * One category block of SC-18 COURSES: "UI/UX Design" + "Top-rated" badge (avg >= 4.5),
 * "View all" link and a horizontally scrolling row of `CourseCardVertical`.
 */
function TeacherCourseGroupBase({
  group,
  onPressCourse,
  onToggleBookmark,
  onViewAll,
}: TeacherCourseGroupProps) {
  const categoryId = group.category.id;
  const handleViewAll = useCallback(() => onViewAll(categoryId), [onViewAll, categoryId]);

  const renderCourse = useCallback(
    ({ item }: { item: CourseSummary }) => (
      <CourseCardVertical
        course={item}
        width={COURSE_CARD_WIDTH}
        onPress={onPressCourse}
        onToggleBookmark={onToggleBookmark}
      />
    ),
    [onPressCourse, onToggleBookmark],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <AppText variant="h3" accessibilityRole="header" numberOfLines={1} style={styles.title}>
            {group.category.name}
          </AppText>
          {group.isTopRated ? <Badge label="Top-rated" shape="pill" tone="primary" /> : null}
        </View>
        <Pressable
          onPress={handleViewAll}
          hitSlop={{ top: 16, bottom: 16, left: 12, right: 8 }}
          accessibilityRole="link"
          accessibilityLabel={`${STRINGS.common.viewAll}, ${group.category.name}`}
        >
          <AppText variant="caption" color="primaryText">
            {STRINGS.common.viewAll}
          </AppText>
        </Pressable>
      </View>
      <FlatList
        horizontal
        data={group.courses}
        renderItem={renderCourse}
        keyExtractor={keyExtractor}
        ItemSeparatorComponent={Separator}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md, paddingTop: spacing.xxxl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: 32,
    paddingHorizontal: layout.screenPaddingX,
  },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { flexShrink: 1 },
  listContent: { paddingHorizontal: layout.screenPaddingX },
  separator: { width: spacing.lg },
});

export const TeacherCourseGroup = memo(TeacherCourseGroupBase);
