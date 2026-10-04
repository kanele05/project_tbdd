import { memo, useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { CourseCardVertical } from '@/components/course/CourseCardVertical';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { useTranslation } from '@/i18n';
import { layout, spacing } from '@/theme';
import type { CourseSummary, TeacherCoursesGroupDto } from '@/types/api';

export type TeacherCourseGroupProps = {
  group: TeacherCoursesGroupDto;
  onPressCourse: (course: CourseSummary) => void;
  onToggleBookmark: (course: CourseSummary) => void;
  /** "View all" -> SC-08 filtered by this teacher + this category. */
  onViewAll: (categoryId: string) => void;
};

const keyExtractor = (course: CourseSummary): string => course.id;
const Separator = () => <View style={styles.separator} />;

/**
 * One category block of SC-18 COURSES: serif category name + "Top-rated" badge (avg >= 4.5),
 * "View all" link and a horizontal rail of poster cards.
 */
function TeacherCourseGroupBase({
  group,
  onPressCourse,
  onToggleBookmark,
  onViewAll,
}: TeacherCourseGroupProps) {
  const { t } = useTranslation(['teacher', 'common']);
  const categoryId = group.category.id;
  const handleViewAll = useCallback(() => onViewAll(categoryId), [onViewAll, categoryId]);

  const renderCourse = useCallback(
    ({ item }: { item: CourseSummary }) => (
      <CourseCardVertical
        course={item}
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
          <AppText variant="h2" accessibilityRole="header" numberOfLines={1} style={styles.title}>
            {group.category.name}
          </AppText>
          {group.isTopRated ? <Badge label={t('teacher:topRated')} shape="pill" /> : null}
        </View>
        <Pressable
          onPress={handleViewAll}
          hitSlop={{ top: 16, bottom: 16, left: 12, right: 8 }}
          accessibilityRole="link"
          accessibilityLabel={t('teacher:viewAllIn', { category: group.category.name })}
        >
          <AppText variant="caption" color="primaryText" family="bodySemiBold">
            {t('common:actions.viewAll')}
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
  container: { gap: spacing.md, paddingTop: layout.sectionGap },
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
  separator: { width: layout.railGap },
});

export const TeacherCourseGroup = memo(TeacherCourseGroupBase);
