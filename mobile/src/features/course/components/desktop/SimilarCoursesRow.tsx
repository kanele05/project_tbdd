import { router } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import {
  CourseCardDesktop,
  CourseCardDesktopSkeleton,
  type DesktopCardCourse,
} from '@/components/course';
import { AppText, Button, SectionHeader } from '@/components/ui';
import { useToggleBookmark } from '@/features/bookmark/hooks';
import { useTranslation } from '@/i18n';
import { makeStyles, spacing } from '@/theme';

import { useSimilarCourses } from '../../hooks';

export type SimilarCoursesRowProps = { courseId: string };

/** 16:9 card width on the PC page. */
const CARD_WIDTH = 280;
const SKELETON_KEYS = ['a', 'b', 'c', 'd'] as const;

/**
 * "Similar courses" at the bottom of the PC course page: a wrapping row of posters (up to 3 from
 * the API). Four states: skeleton, error with Retry, hidden when empty, posters.
 */
export function SimilarCoursesRow({ courseId }: SimilarCoursesRowProps) {
  const { t } = useTranslation(['course', 'common']);
  const styles = useStyles();
  const { data, isPending, isError, refetch } = useSimilarCourses(courseId);
  const { toggleBookmark } = useToggleBookmark();

  const handlePress = useCallback((course: DesktopCardCourse) => {
    router.push(`/course/${course.id}`);
  }, []);
  const handleToggleBookmark = useCallback(
    (card: DesktopCardCourse) => {
      const course = data?.find((item) => item.id === card.id);
      if (course) toggleBookmark(course.id, course.isBookmarked, course);
    },
    [data, toggleBookmark],
  );

  let body;
  if (isPending) {
    body = SKELETON_KEYS.map((key) => <CourseCardDesktopSkeleton key={key} width={CARD_WIDTH} />);
  } else if (isError) {
    body = (
      <View style={styles.error}>
        <AppText variant="body" color="textSecondary">
          {t('course:similar.failed')}
        </AppText>
        <Button
          title={t('common:actions.retry')}
          variant="ghost"
          size="sm"
          onPress={() => void refetch()}
        />
      </View>
    );
  } else if (!data || data.length === 0) {
    return null;
  } else {
    body = data.map((course) => (
      <CourseCardDesktop
        key={course.id}
        course={course}
        width={CARD_WIDTH}
        onPress={handlePress}
        onToggleBookmark={handleToggleBookmark}
      />
    ));
  }

  return (
    <View style={styles.container} testID="similar-courses-row">
      <SectionHeader title={t('course:similar.title')} />
      <View style={styles.row}>{body}</View>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  container: { gap: spacing.lg, paddingTop: spacing.huge },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xl },
  error: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
}));
