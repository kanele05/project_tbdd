import type { AiLang, CourseListParams, MyCoursesStatus } from '@/types/api';

/**
 * Central query-key factory (CLAUDE.md §7, PLAN.md §10). Never write key arrays inline.
 *
 * Invalidation tips:
 * - `queryKeys.me()` is a prefix of every `['me', ...]` key. Use `{ exact: true }` to only refresh
 *   the profile, or invalidate the specific key (`meStats()`, `meBookmarks()`, `meCourses(...)`).
 * - `queryKeys.course(id)` is a prefix of all `['course', id, ...]` keys (curriculum, reviews...),
 *   so `invalidateQueries({ queryKey: queryKeys.course(id) })` refreshes the whole course.
 * - `queryKeys.coursesAll()` refreshes every course list (search results, category lists...).
 */
export const queryKeys = {
  /* ---- session / profile ---- */
  /** `GET /auth/me` - persisted. */
  me: () => ['me'] as const,
  /** `GET /me/courses?status=` - persisted. Prefix for all statuses: `meCoursesAll()`. */
  meCourses: (status: MyCoursesStatus = 'all') => ['me', 'courses', status] as const,
  meCoursesAll: () => ['me', 'courses'] as const,
  /** `GET /me/stats` - persisted. */
  meStats: () => ['me', 'stats'] as const,
  /** `GET /me/bookmarks` - persisted. */
  meBookmarks: () => ['me', 'bookmarks'] as const,

  /* ---- home & catalog ---- */
  /** `GET /home` - persisted. */
  home: () => ['home'] as const,
  /** `GET /categories` - persisted. */
  categories: () => ['categories'] as const,
  /** `GET /tags/hot` - persisted. */
  hotTags: () => ['tags', 'hot'] as const,

  /* ---- courses ---- */
  /** Prefix of every course list. */
  coursesAll: () => ['courses'] as const,
  /** `GET /courses` (infinite) - NOT persisted. */
  coursesList: (params: CourseListParams = {}) => ['courses', 'list', params] as const,
  /** `GET /courses?limit=1` -> `meta.total` for the Filter "Apply (n results)" button - NOT persisted. */
  coursesCount: (params: CourseListParams = {}) => ['courses', 'count', params] as const,
  /** `GET /courses/:id` - persisted. Also the prefix of all keys of that course. */
  course: (id: string) => ['course', id] as const,
  /** `GET /courses/:id/curriculum` - persisted. */
  courseCurriculum: (id: string) => ['course', id, 'curriculum'] as const,
  /** `GET /courses/:id/similar`. */
  courseSimilar: (id: string) => ['course', id, 'similar'] as const,
  /** `GET /courses/:id/reviews?rating=` (infinite). `filter` = star rating or 'all'. Prefix: `courseReviewsAll`. */
  courseReviews: (id: string, filter: number | 'all' = 'all') =>
    ['course', id, 'reviews', filter] as const,
  courseReviewsAll: (id: string) => ['course', id, 'reviews'] as const,
  /** `GET /courses/:id/reviews/me`. */
  courseMyReview: (id: string) => ['course', id, 'my-review'] as const,
  /** `GET /courses/:id/questions` (infinite). */
  courseQuestions: (id: string) => ['course', id, 'questions'] as const,
  /** `GET /courses/:id/project`. */
  courseProject: (id: string) => ['course', id, 'project'] as const,
  /** `GET /courses/:id/submissions` (infinite). */
  courseSubmissions: (id: string) => ['course', id, 'submissions'] as const,

  /* ---- learning / Q&A ---- */
  /** `GET /lessons/:id` - never cached (staleTime 0). */
  lesson: (id: string) => ['lesson', id] as const,
  /** `GET /questions/:id`. */
  question: (id: string) => ['question', id] as const,
  /** `GET /questions/:id/answers` (infinite). */
  questionAnswers: (id: string) => ['question', id, 'answers'] as const,

  /* ---- commerce ---- */
  /** `GET /cart`. */
  cart: () => ['cart'] as const,
  /** `GET /orders`. */
  orders: () => ['orders'] as const,

  /* ---- teachers ---- */
  /** `GET /teachers` (infinite). */
  teachersList: () => ['teachers', 'list'] as const,
  /** `GET /teachers/:id` - persisted. Also the prefix of all keys of that teacher. */
  teacher: (id: string) => ['teacher', id] as const,
  /** `GET /teachers/:id/courses` - persisted. */
  teacherCourses: (id: string) => ['teacher', id, 'courses'] as const,
  /** `GET /teachers/:id/reviews` (infinite) - persisted. */
  teacherReviews: (id: string) => ['teacher', id, 'reviews'] as const,

  /* ---- AI (phase 2) - keys carry the UI language; NOT persisted (answers are cached server-side) ---- */
  /** Prefix of every AI key. */
  aiAll: () => ['ai'] as const,
  /** `GET /courses/:id/ai/summary`. */
  aiCourseSummary: (courseId: string, lang: AiLang) =>
    ['ai', 'course-summary', courseId, lang] as const,
  /** `GET /lessons/:id/ai/summary`. */
  aiLessonSummary: (lessonId: string, lang: AiLang) =>
    ['ai', 'lesson-summary', lessonId, lang] as const,
  /** Result of `POST /lessons/:id/ai/quiz`, kept so reopening the quiz is instant. */
  aiLessonQuiz: (lessonId: string, lang: AiLang) => ['ai', 'lesson-quiz', lessonId, lang] as const,
  /** `GET /me/ai/recommendations`. */
  aiRecommendations: (lang: AiLang) => ['ai', 'recommendations', lang] as const,
  /** `GET /courses/:id/ai/chat` (infinite). */
  aiChat: (courseId: string) => ['ai', 'chat', courseId] as const,

  /* ---- notifications ---- */
  /** `GET /notifications`. */
  notifications: () => ['notifications'] as const,
  /** `GET /notifications/unread-count` (badge of the Home bell). Child of `notifications()`. */
  notificationsUnreadCount: () => ['notifications', 'unread-count'] as const,
} as const;

/**
 * Which queries are written to the persisted (AsyncStorage) cache - the "Persist offline" column
 * of PLAN.md §10. Everything else lives in memory only.
 */
export function isPersistedQueryKey(queryKey: readonly unknown[]): boolean {
  const [root, , sub] = queryKey;
  switch (root) {
    case 'me':
    case 'home':
    case 'categories':
    case 'tags':
      return true;
    case 'course':
      // ['course', id] and ['course', id, 'curriculum']
      return queryKey.length === 2 || sub === 'curriculum';
    case 'teacher':
      // ['teacher', id], ['teacher', id, 'courses'|'reviews']
      return queryKey.length === 2 || sub === 'courses' || sub === 'reviews';
    default:
      return false;
  }
}
