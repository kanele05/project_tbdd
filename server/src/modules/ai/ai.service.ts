import { consumeAiBudget, getAiProvider, rethrowAsApiError } from '@/lib/ai';
import type { AiQuotaBucket } from '@/lib/ai/quota';
import type { AiLang } from '@/lib/ai/types';
import { ApiError } from '@/lib/ApiError';
import { assertCoursePublished } from '@/lib/enrollmentGuard';
import { prisma } from '@/lib/prisma';
import { findCourseSummariesByIds, getRecommendedCourseIds } from '@/modules/course/course.service';
import type {
  AiCourseSummaryDto,
  AiLessonSummaryDto,
  AiQuizDto,
  AiRecommendationsDto,
} from '@/types/dto';

import { getOrCreateAiContent } from './ai.cache';
import {
  extractSentences,
  FALLBACK_ENCOURAGEMENT,
  mockCourseSummary,
  mockLessonSummary,
  mockQuiz,
  mockRecommendations,
  type QuizPool,
} from './ai.mock';
import {
  buildCourseSummaryPrompt,
  buildLessonSummaryPrompt,
  buildQuizPrompt,
  buildRecommendationsPrompt,
} from './ai.prompts';
import { normalizeRecommendationItems } from './ai.recommend';
import {
  courseSummaryOutput,
  lessonSummaryOutput,
  QUIZ_OPTION_COUNT,
  QUIZ_QUESTION_COUNT,
  quizOutput,
  RECOMMENDATION_MAX,
  type RecommendationsOutput,
  recommendationsOutput,
} from './ai.schema';
import type {
  CourseMaterial,
  LearnerProfile,
  LessonFocus,
  RecommendationCandidate,
} from './ai.types';

/** BR-12 trả tối đa 500 id đã xếp hạng; chỉ đưa top N vào prompt cho gọn token. */
export const CANDIDATE_LIMIT = 12;
export const RECOMMENDATIONS_TTL_MS = 24 * 60 * 60 * 1000;
const PROFILE_LIMIT = 10;

/**
 * Trừ lượt rate limit AI (giờ/user, ngày/user, ngày/server) rồi chạy `task` (gọi AI); lỗi thì hoàn lượt và đổi lỗi AI
 * thành `ApiError` (429 `AI_RATE_LIMITED` / 422 `AI_BLOCKED` / 503 `AI_UNAVAILABLE`).
 */
export async function runAi<T>(
  userId: string,
  bucket: AiQuotaBucket,
  task: () => Promise<T>,
): Promise<T> {
  let refund: (() => void) | undefined;
  try {
    refund = consumeAiBudget(bucket, userId);
    return await task();
  } catch (err) {
    refund?.();
    return rethrowAsApiError(err);
  }
}

// ---------------------------------------------------------------- Đọc dữ liệu khóa / bài

export async function loadCourseMaterial(courseId: string): Promise<CourseMaterial> {
  const course = await prisma.course.findFirst({
    where: { id: courseId, status: 'PUBLISHED' },
    select: {
      id: true,
      title: true,
      subtitle: true,
      description: true,
      benefits: true,
      category: { select: { name: true } },
      teacher: { select: { user: { select: { fullName: true } } } },
      sections: {
        orderBy: { order: 'asc' },
        select: {
          title: true,
          lessons: {
            orderBy: { order: 'asc' },
            select: { id: true, title: true, durationSec: true, content: true },
          },
        },
      },
    },
  });
  if (!course) throw ApiError.of('COURSE_NOT_FOUND', 'Course not found');
  return {
    id: course.id,
    title: course.title,
    subtitle: course.subtitle,
    description: course.description,
    category: course.category.name,
    teacher: course.teacher.user.fullName,
    benefits: course.benefits,
    sections: course.sections,
  };
}

type LessonAccess = LessonFocus & { courseId: string };

/**
 * Đọc bài học và kiểm tra quyền (BR-01): đã ghi danh, hoặc (nếu `allowPreview`) bài xem thử.
 * Không đủ quyền -> 403 `NOT_ENROLLED`; không có bài -> 404 `LESSON_NOT_FOUND`.
 */
export async function loadLessonForAi(
  userId: string,
  lessonId: string,
  options: { allowPreview: boolean },
): Promise<LessonAccess> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      title: true,
      content: true,
      isPreview: true,
      section: {
        select: { title: true, courseId: true, course: { select: { title: true } } },
      },
    },
  });
  if (!lesson) throw ApiError.of('LESSON_NOT_FOUND', 'Lesson not found');

  const courseId = lesson.section.courseId;
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { id: true },
  });
  if (!enrollment && !(options.allowPreview && lesson.isPreview)) {
    throw ApiError.of('NOT_ENROLLED', 'Enroll in this course to use AI features for this lesson');
  }
  return {
    id: lesson.id,
    title: lesson.title,
    content: lesson.content,
    sectionTitle: lesson.section.title,
    courseTitle: lesson.section.course.title,
    courseId,
  };
}

// ---------------------------------------------------------------- GET /courses/:id/ai/summary

export async function getCourseSummary(
  userId: string,
  courseId: string,
  lang: AiLang,
): Promise<AiCourseSummaryDto> {
  await assertCoursePublished(courseId);
  const result = await getOrCreateAiContent({
    kind: 'COURSE_SUMMARY',
    refId: courseId,
    lang,
    schema: courseSummaryOutput,
    generate: () =>
      runAi(userId, 'general', async () => {
        const course = await loadCourseMaterial(courseId);
        const { system, prompt } = buildCourseSummaryPrompt(course, lang);
        return getAiProvider().generateJson({
          label: 'course_summary',
          system,
          prompt,
          schema: courseSummaryOutput,
          mock: () => mockCourseSummary(course, lang),
        });
      }),
  });
  return {
    courseId,
    lang,
    ...result.data,
    model: result.model,
    generatedAt: result.generatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------- GET /lessons/:id/ai/summary

export async function getLessonSummary(
  userId: string,
  lessonId: string,
  lang: AiLang,
): Promise<AiLessonSummaryDto> {
  const lesson = await loadLessonForAi(userId, lessonId, { allowPreview: true });
  const result = await getOrCreateAiContent({
    kind: 'LESSON_SUMMARY',
    refId: lessonId,
    lang,
    schema: lessonSummaryOutput,
    generate: () =>
      runAi(userId, 'general', async () => {
        const { system, prompt } = buildLessonSummaryPrompt(lesson, lang);
        return getAiProvider().generateJson({
          label: 'lesson_summary',
          system,
          prompt,
          schema: lessonSummaryOutput,
          mock: () => mockLessonSummary(lesson, lang),
        });
      }),
  });
  return {
    lessonId,
    lang,
    ...result.data,
    model: result.model,
    generatedAt: result.generatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------- POST /lessons/:id/ai/quiz

/** Đáp án nhiễu cho quiz giả: tiêu đề + câu trong ghi chú các bài khác cùng khóa. */
async function loadQuizPool(courseId: string, lessonId: string): Promise<QuizPool> {
  const others = await prisma.lesson.findMany({
    where: { section: { courseId }, id: { not: lessonId } },
    orderBy: [{ section: { order: 'asc' } }, { order: 'asc' }],
    take: 12,
    select: { title: true, content: true },
  });
  return {
    titles: others.map((l) => l.title),
    sentences: others.flatMap((l) => extractSentences(l.content, 2)),
  };
}

export async function createLessonQuiz(
  userId: string,
  lessonId: string,
  lang: AiLang,
): Promise<AiQuizDto> {
  const lesson = await loadLessonForAi(userId, lessonId, { allowPreview: false });
  const result = await getOrCreateAiContent({
    kind: 'QUIZ',
    refId: lessonId,
    lang,
    schema: quizOutput,
    generate: () =>
      runAi(userId, 'general', async () => {
        const { system, prompt } = buildQuizPrompt(lesson, lang, {
          questions: QUIZ_QUESTION_COUNT,
          options: QUIZ_OPTION_COUNT,
        });
        return getAiProvider().generateJson({
          label: 'lesson_quiz',
          system,
          prompt,
          schema: quizOutput,
          mock: async () => mockQuiz(lesson, await loadQuizPool(lesson.courseId, lessonId), lang),
        });
      }),
  });
  return {
    lessonId,
    lang,
    questions: result.data.questions,
    model: result.model,
    generatedAt: result.generatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------- GET /me/ai/recommendations

async function loadCandidates(ids: readonly string[]): Promise<RecommendationCandidate[]> {
  const rows = await prisma.course.findMany({
    where: { id: { in: [...ids] }, status: 'PUBLISHED' },
    select: {
      id: true,
      title: true,
      subtitle: true,
      ratingAvg: true,
      ratingCount: true,
      lessonCount: true,
      priceCents: true,
      category: { select: { name: true } },
      teacher: { select: { user: { select: { fullName: true } } } },
      tags: { select: { tag: { select: { name: true } } } },
    },
  });
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.flatMap((id) => {
    const row = byId.get(id);
    if (!row) return [];
    return [
      {
        id: row.id,
        title: row.title,
        subtitle: row.subtitle,
        category: row.category.name,
        teacher: row.teacher.user.fullName,
        ratingAvg: row.ratingAvg,
        ratingCount: row.ratingCount,
        lessonCount: row.lessonCount,
        priceCents: row.priceCents,
        tags: row.tags.map((t) => t.tag.name),
      },
    ];
  });
}

async function loadProfile(userId: string): Promise<LearnerProfile> {
  const [enrollments, bookmarks] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId },
      orderBy: { lastAccessedAt: 'desc' },
      take: PROFILE_LIMIT,
      select: {
        progressPercent: true,
        course: { select: { title: true, category: { select: { name: true } } } },
      },
    }),
    prisma.bookmark.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: PROFILE_LIMIT,
      select: { course: { select: { title: true, category: { select: { name: true } } } } },
    }),
  ]);
  return {
    enrolled: enrollments.map((e) => ({
      title: e.course.title,
      category: e.course.category.name,
      progressPercent: e.progressPercent,
    })),
    saved: bookmarks.map((b) => ({ title: b.course.title, category: b.course.category.name })),
  };
}

async function generateRecommendations(
  userId: string,
  lang: AiLang,
): Promise<{ data: RecommendationsOutput; model: string; cache?: boolean }> {
  const rankedIds = await getRecommendedCourseIds(userId); // BR-12, đã loại khóa đã ghi danh
  const candidates = await loadCandidates(rankedIds.slice(0, CANDIDATE_LIMIT));
  if (candidates.length === 0) {
    // Không còn gì để gợi ý: không gọi AI và không cache (mai có khóa mới thì gợi ý được ngay).
    const data = { encouragement: FALLBACK_ENCOURAGEMENT[lang], items: [] };
    return { data, model: getAiProvider().model, cache: false };
  }

  const profile = await loadProfile(userId);
  const maxItems = Math.min(RECOMMENDATION_MAX, candidates.length);
  const { system, prompt } = buildRecommendationsPrompt(candidates, profile, lang, maxItems);
  const result = await runAi(userId, 'general', () =>
    getAiProvider().generateJson({
      label: 'recommendations',
      system,
      prompt,
      schema: recommendationsOutput,
      mock: () => mockRecommendations(candidates, profile, lang, maxItems),
    }),
  );
  const items = normalizeRecommendationItems(result.data.items, candidates, lang, maxItems);
  return { data: { encouragement: result.data.encouragement, items }, model: result.model };
}

/** Bản cache còn dùng được khi user chưa ghi danh khóa nào trong danh sách gợi ý. */
async function hasNoEnrollmentIn(userId: string, courseIds: readonly string[]): Promise<boolean> {
  const count = await prisma.enrollment.count({
    where: { userId, courseId: { in: [...courseIds] } },
  });
  return count === 0;
}

export async function getRecommendations(
  userId: string,
  lang: AiLang,
): Promise<AiRecommendationsDto> {
  const result = await getOrCreateAiContent({
    kind: 'RECOMMENDATIONS',
    refId: userId,
    lang,
    schema: recommendationsOutput,
    ttlMs: RECOMMENDATIONS_TTL_MS,
    // Mua một khóa trong lộ trình -> lộ trình cũ lỗi thời, sinh lại ở lần xem kế tiếp.
    isUsable: (data) =>
      hasNoEnrollmentIn(
        userId,
        data.items.map((item) => item.courseId),
      ),
    generate: () => generateRecommendations(userId, lang),
  });

  const reasons = new Map(result.data.items.map((item) => [item.courseId, item.reason]));
  const courses = await findCourseSummariesByIds([...reasons.keys()], userId);
  const byId = new Map(courses.map((course) => [course.id, course]));
  return {
    lang,
    encouragement: result.data.encouragement,
    // Giữ thứ tự lộ trình của AI; bỏ khóa đã bị gỡ (findCourseSummariesByIds chỉ trả khóa còn publish).
    items: [...reasons].flatMap(([id, reason]) => {
      const course = byId.get(id);
      return course ? [{ course, reason }] : [];
    }),
    model: result.model,
    generatedAt: result.generatedAt.toISOString(),
  };
}
