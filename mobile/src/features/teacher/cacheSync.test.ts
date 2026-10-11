import { QueryClient } from '@tanstack/react-query';

import { makeCourse } from '@/components/course/courseFixtures';
import { queryKeys } from '@/lib/queryKeys';
import type { CourseDetail, TeacherDetail } from '@/types/api';

import { patchFollowInCaches, restoreSnapshot } from './cacheSync';

/** gcTime: Infinity => no garbage-collection timers left running after the test. */
const createClient = () => new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });

function makeTeacher(overrides: Partial<TeacherDetail> = {}): TeacherDetail {
  return {
    id: 't1',
    fullName: 'Sara Weise',
    avatarUrl: null,
    organization: null,
    ratingAvg: 4.5,
    ratingCount: 10,
    jobTitle: 'UI/UX Designer',
    bio: 'Bio',
    coverUrl: null,
    location: 'New York',
    timezone: 'America/New_York',
    isFollowed: false,
    stats: { courseCount: 3, studentCount: 100, followerCount: 10 },
    ...overrides,
  };
}

function makeCourseDetail(id: string, teacherId: string): CourseDetail {
  return {
    status: 'PUBLISHED',
    ...makeCourse({ id, teacher: { id: teacherId, fullName: 'Sara Weise' } }),
    subtitle: null,
    description: '',
    bannerUrl: null,
    benefits: [],
    likeCount: 0,
    shareCount: 0,
    isLiked: false,
    category: { id: 'cat1', name: 'Design' },
    teacher: {
      id: teacherId,
      fullName: 'Sara Weise',
      avatarUrl: null,
      jobTitle: 'Designer',
      isFollowed: false,
    },
    enrollment: null,
    isInCart: false,
    previewLessonId: null,
  };
}

describe('patchFollowInCaches', () => {
  it('updates the teacher detail and the course details of that teacher only', () => {
    const queryClient = createClient();
    queryClient.setQueryData(queryKeys.teacher('t1'), makeTeacher());
    queryClient.setQueryData(queryKeys.course('c1'), makeCourseDetail('c1', 't1'));
    queryClient.setQueryData(queryKeys.course('c2'), makeCourseDetail('c2', 'other'));
    // Sub-resources of a course share the prefix but are not course details.
    queryClient.setQueryData(queryKeys.courseCurriculum('c1'), [{ id: 's1' }]);

    patchFollowInCaches(queryClient, 't1', { isFollowed: true });

    const teacher = queryClient.getQueryData<TeacherDetail>(queryKeys.teacher('t1'));
    expect(teacher?.isFollowed).toBe(true);
    expect(teacher?.stats.followerCount).toBe(11);
    expect(queryClient.getQueryData<CourseDetail>(queryKeys.course('c1'))?.teacher.isFollowed).toBe(
      true,
    );
    expect(queryClient.getQueryData<CourseDetail>(queryKeys.course('c2'))?.teacher.isFollowed).toBe(
      false,
    );
    expect(queryClient.getQueryData(queryKeys.courseCurriculum('c1'))).toEqual([{ id: 's1' }]);
  });

  it('decrements the follower count on unfollow and never goes below zero', () => {
    const queryClient = createClient();
    queryClient.setQueryData(
      queryKeys.teacher('t1'),
      makeTeacher({
        isFollowed: true,
        stats: { courseCount: 1, studentCount: 1, followerCount: 0 },
      }),
    );

    patchFollowInCaches(queryClient, 't1', { isFollowed: false });

    const teacher = queryClient.getQueryData<TeacherDetail>(queryKeys.teacher('t1'));
    expect(teacher?.isFollowed).toBe(false);
    expect(teacher?.stats.followerCount).toBe(0);
  });

  it('uses the server follower count when provided', () => {
    const queryClient = createClient();
    queryClient.setQueryData(queryKeys.teacher('t1'), makeTeacher());

    patchFollowInCaches(queryClient, 't1', { isFollowed: true, followerCount: 42 });

    expect(
      queryClient.getQueryData<TeacherDetail>(queryKeys.teacher('t1'))?.stats.followerCount,
    ).toBe(42);
  });

  it('returns a snapshot that restoreSnapshot puts back', () => {
    const queryClient = createClient();
    const original = makeTeacher();
    queryClient.setQueryData(queryKeys.teacher('t1'), original);
    queryClient.setQueryData(queryKeys.course('c1'), makeCourseDetail('c1', 't1'));

    const snapshot = patchFollowInCaches(queryClient, 't1', { isFollowed: true });
    expect(snapshot).toHaveLength(2);
    restoreSnapshot(queryClient, snapshot);

    expect(queryClient.getQueryData(queryKeys.teacher('t1'))).toEqual(original);
    expect(queryClient.getQueryData<CourseDetail>(queryKeys.course('c1'))?.teacher.isFollowed).toBe(
      false,
    );
  });

  it('does nothing when nothing is cached', () => {
    const queryClient = createClient();
    expect(patchFollowInCaches(queryClient, 't1', { isFollowed: true })).toEqual([]);
  });
});
