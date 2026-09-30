import { isPersistedQueryKey, queryKeys } from './queryKeys';

describe('queryKeys', () => {
  it('builds stable, hierarchical keys', () => {
    expect(queryKeys.me()).toEqual(['me']);
    expect(queryKeys.meCourses('ongoing')).toEqual(['me', 'courses', 'ongoing']);
    expect(queryKeys.meCourses()).toEqual(['me', 'courses', 'all']);
    expect(queryKeys.meStats()).toEqual(['me', 'stats']);
    expect(queryKeys.meBookmarks()).toEqual(['me', 'bookmarks']);
    expect(queryKeys.hotTags()).toEqual(['tags', 'hot']);
    expect(queryKeys.course('c1')).toEqual(['course', 'c1']);
    expect(queryKeys.courseCurriculum('c1')).toEqual(['course', 'c1', 'curriculum']);
    expect(queryKeys.courseReviews('c1', 5)).toEqual(['course', 'c1', 'reviews', 5]);
    expect(queryKeys.courseReviews('c1')).toEqual(['course', 'c1', 'reviews', 'all']);
    expect(queryKeys.courseQuestions('c1')).toEqual(['course', 'c1', 'questions']);
    expect(queryKeys.questionAnswers('q1')).toEqual(['question', 'q1', 'answers']);
    expect(queryKeys.courseProject('c1')).toEqual(['course', 'c1', 'project']);
    expect(queryKeys.courseSubmissions('c1')).toEqual(['course', 'c1', 'submissions']);
    expect(queryKeys.lesson('l1')).toEqual(['lesson', 'l1']);
    expect(queryKeys.teacherReviews('t1')).toEqual(['teacher', 't1', 'reviews']);
    expect(queryKeys.cart()).toEqual(['cart']);
    expect(queryKeys.notifications()).toEqual(['notifications']);
  });

  it('includes the params in the course list key', () => {
    expect(queryKeys.coursesList({ q: 'design', page: 2 })).toEqual([
      'courses',
      'list',
      { q: 'design', page: 2 },
    ]);
  });
});

describe('isPersistedQueryKey (PLAN.md §10 persist column)', () => {
  it.each([
    [queryKeys.me()],
    [queryKeys.home()],
    [queryKeys.categories()],
    [queryKeys.hotTags()],
    [queryKeys.course('c1')],
    [queryKeys.courseCurriculum('c1')],
    [queryKeys.meCourses('all')],
    [queryKeys.meStats()],
    [queryKeys.meBookmarks()],
    [queryKeys.teacher('t1')],
    [queryKeys.teacherCourses('t1')],
    [queryKeys.teacherReviews('t1')],
  ])('persists %j', (key) => {
    expect(isPersistedQueryKey(key)).toBe(true);
  });

  it.each([
    [queryKeys.coursesList({})],
    [queryKeys.courseReviews('c1', 'all')],
    [queryKeys.courseSimilar('c1')],
    [queryKeys.cart()],
    [queryKeys.lesson('l1')],
    [queryKeys.courseQuestions('c1')],
    [queryKeys.questionAnswers('q1')],
    [queryKeys.courseProject('c1')],
    [queryKeys.courseSubmissions('c1')],
    [queryKeys.notifications()],
    [queryKeys.teachersList()],
  ])('does not persist %j', (key) => {
    expect(isPersistedQueryKey(key)).toBe(false);
  });
});
