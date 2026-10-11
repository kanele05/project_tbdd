import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing } from '@/theme';
import type { AdminStatsDto } from '@/types/api';
import { formatPrice } from '@/utils/formatPrice';

type TopCourse = AdminStatsDto['topCourses'][number];

export type TopCoursesListProps = {
  courses: readonly TopCourse[];
  onPressCourse: (courseId: string) => void;
};

/** Top 5 published courses by enrollments (SC-31). Each row opens the course in the review detail. */
function TopCoursesListBase({ courses, onPressCourse }: TopCoursesListProps) {
  const { t } = useTranslation('admin');
  const styles = useStyles();
  return (
    <View style={styles.list}>
      {courses.map((course, index) => (
        <Pressable
          key={course.id}
          onPress={() => onPressCourse(course.id)}
          accessibilityRole="button"
          accessibilityLabel={t('dashboard.topCourseLabel', {
            rank: index + 1,
            title: course.title,
            enrollments: t('dashboard.enrollments', { count: course.enrollmentCount }),
            revenue: formatPrice(course.revenueCents),
          })}
          style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
        >
          <AppText variant="h3" color="primaryText" style={styles.rank}>
            {index + 1}
          </AppText>
          {course.thumbnailUrl ? (
            <Image
              source={{ uri: course.thumbnailUrl }}
              style={styles.thumb}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={course.thumbnailUrl}
            />
          ) : (
            <View style={styles.thumb} />
          )}
          <View style={styles.body}>
            <AppText variant="cardTitle" numberOfLines={2}>
              {course.title}
            </AppText>
            <AppText variant="caption" color="textSecondary" numberOfLines={1}>
              {course.teacher.fullName}
            </AppText>
            <AppText variant="caption" numberOfLines={1}>
              {t('dashboard.enrollments', { count: course.enrollmentCount })} ·{' '}
              {formatPrice(course.revenueCents)}
            </AppText>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  list: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.borderSubtle,
  },
  pressed: { backgroundColor: t.colors.surfaceAlt },
  rank: { width: 20, textAlign: 'center' },
  thumb: { width: 64, height: 44, borderRadius: radius.badge, backgroundColor: t.colors.surface },
  body: { flex: 1, gap: spacing.xxs },
}));

export const TopCoursesList = memo(TopCoursesListBase);
