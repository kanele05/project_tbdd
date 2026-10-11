import { router } from 'expo-router';
import { useCallback } from 'react';

import { useToggleBookmark } from '@/features/bookmark/hooks';
import { useToggleCourseLike } from '@/features/learning/hooks';
import { useToggleFollow } from '@/features/teacher/hooks';
import { useIsCourseOwner } from '@/features/teaching/hooks';
import { useAuthStore } from '@/stores/authStore';
import type { CourseDetail } from '@/types/api';

import type { CourseAction } from './courseAction';
import { useCourseAction } from './useCourseAction';
import { useShareCourse } from './useShareCourse';

export type CourseDetailActions = {
  isSignedIn: boolean;
  /** The signed-in user teaches this course (BR-23). */
  isOwner: boolean;
  isActionLoading: boolean;
  onAction: (action: CourseAction) => void;
  onManage: () => void;
  onToggleBookmark: () => void;
  onToggleLike: () => void;
  onShare: () => void;
  onOpenTeacher: () => void;
  onToggleFollow: () => void;
};

/**
 * Every action of the course-details screen (cart / enroll, bookmark, like, share, follow, manage)
 * for one loaded course - shared by the phone body and the PC body.
 */
export function useCourseDetailActions(course: CourseDetail): CourseDetailActions {
  const isSignedIn = useAuthStore((state) => state.user !== null);
  const { toggleBookmark } = useToggleBookmark();
  const { mutate: toggleLike } = useToggleCourseLike(course.id);
  const { toggleFollow } = useToggleFollow();
  const share = useShareCourse(course);
  const { perform, isLoading } = useCourseAction(course.id);
  const isOwner = useIsCourseOwner(course.teacher.id);

  const { id, isBookmarked, isLiked, teacher } = course;
  const handleManage = useCallback(() => router.push(`/studio/${id}`), [id]);
  const handleToggleBookmark = useCallback(
    () => toggleBookmark(id, isBookmarked),
    [id, isBookmarked, toggleBookmark],
  );
  const handleToggleLike = useCallback(() => toggleLike(isLiked), [isLiked, toggleLike]);
  const handleShare = useCallback(() => void share(), [share]);
  const handleOpenTeacher = useCallback(() => router.push(`/teacher/${teacher.id}`), [teacher.id]);
  const handleToggleFollow = useCallback(
    () => toggleFollow(teacher.id, teacher.isFollowed),
    [teacher.id, teacher.isFollowed, toggleFollow],
  );

  return {
    isSignedIn,
    isOwner,
    isActionLoading: isLoading,
    onAction: perform,
    onManage: handleManage,
    onToggleBookmark: handleToggleBookmark,
    onToggleLike: handleToggleLike,
    onShare: handleShare,
    onOpenTeacher: handleOpenTeacher,
    onToggleFollow: handleToggleFollow,
  };
}
