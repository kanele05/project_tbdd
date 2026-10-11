import { memo } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Skeleton } from '@/components/ui/Skeleton';
import { makeStyles, spacing } from '@/theme';
import type { CourseDetail } from '@/types/api';

import { CourseInfo } from './CourseInfo';

export type DesktopLessonInfoProps = {
  /** Title of the lesson being played; `undefined` while it loads. */
  lessonTitle: string | undefined;
  course: CourseDetail | undefined;
  onToggleLike: () => void;
  onShare: () => void;
};

/**
 * Under the big player on a PC window: the lesson title (serif) and, below it, the course title
 * with the like / share pills (`CourseInfo`).
 */
function DesktopLessonInfoBase({
  lessonTitle,
  course,
  onToggleLike,
  onShare,
}: DesktopLessonInfoProps) {
  const styles = useStyles();
  return (
    <View style={styles.container} testID="desktop-lesson-info">
      {lessonTitle ? (
        <AppText variant="h1" numberOfLines={2} accessibilityRole="header">
          {lessonTitle}
        </AppText>
      ) : (
        <Skeleton width="60%" height={34} />
      )}
      {course ? (
        <CourseInfo
          title={course.title}
          titleVariant="title"
          likeCount={course.likeCount}
          shareCount={course.shareCount}
          isLiked={course.isLiked}
          onToggleLike={onToggleLike}
          onShare={onShare}
        />
      ) : (
        <Skeleton width="40%" height={20} />
      )}
    </View>
  );
}

const useStyles = makeStyles(() => ({
  container: { gap: spacing.lg, padding: spacing.xxl },
}));

export const DesktopLessonInfo = memo(DesktopLessonInfoBase);
