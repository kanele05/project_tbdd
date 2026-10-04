import { aiGlobalQuota, aiQuota, aiUserDailyQuota, setAiProviderForTests } from '@/lib/ai';
import { AiProviderError } from '@/lib/ai/errors';
import { MockProvider } from '@/lib/ai/mock.provider';
import type { AiJsonRequest, AiProvider } from '@/lib/ai/types';
import { prisma } from '@/lib/prisma';
import { findCourseSummariesByIds, getRecommendedCourseIds } from '@/modules/course/course.service';
import type { CourseSummaryDto } from '@/types/dto';

import * as aiService from './ai.service';

jest.mock('@/lib/prisma', () => {
  const model = () => ({
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn(),
  });
  return {
    prisma: {
      course: model(),
      lesson: model(),
      enrollment: model(),
      bookmark: model(),
      aiContent: model(),
    },
  };
});
jest.mock('@/modules/course/course.service', () => ({
  findCourseSummariesByIds: jest.fn(),
  getRecommendedCourseIds: jest.fn(),
}));

type MockModel = Record<string, jest.Mock>;
const db = prisma as unknown as Record<
  'course' | 'lesson' | 'enrollment' | 'bookmark' | 'aiContent',
  MockModel
>;
const findSummaries = findCourseSummariesByIds as jest.Mock;
const rankedIds = getRecommendedCourseIds as jest.Mock;

// ---------------------------------------------------------------- Fixtures

const NOTES = [
  'Wireframes show the structure of a screen before any visual design is added.',
  'Start with the user goal and the main task the screen must support.',
  'Keep the layout simple so people can scan it quickly.',
].join('\n');

const courseRow = {
  id: 'course-1',
  title: 'UX Foundations',
  subtitle: 'Learn the basics',
  description: 'A practical introduction.',
  benefits: ['Understand users', 'Plan research', 'Test ideas'],
  category: { name: 'Design' },
  teacher: { user: { fullName: 'Ada Lovelace' } },
  sections: [
    {
      title: 'Getting started',
      lessons: [
        { id: 'l1', title: 'What is UX?', durationSec: 60, content: NOTES },
        { id: 'l2', title: 'The process', durationSec: 60, content: null },
      ],
    },
    {
      title: 'Wireframes',
      lessons: [{ id: 'l3', title: 'Wireframing key flows', durationSec: 60, content: NOTES }],
    },
  ],
};

const lessonRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'l3',
  title: 'Wireframing key flows',
  content: NOTES,
  isPreview: false,
  section: { title: 'Wireframes', courseId: 'course-1', course: { title: 'UX Foundations' } },
  ...overrides,
});

const candidateRow = (id: string, category = 'Design') => ({
  id,
  title: `Course ${id}`,
  subtitle: null,
  ratingAvg: 4.5,
  ratingCount: 20,
  lessonCount: 8,
  priceCents: 3900,
  category: { name: category },
  teacher: { user: { fullName: 'Teacher' } },
  tags: [{ tag: { name: 'ux' } }],
});

const summaryOf = (id: string) => ({ id, title: `Course ${id}` }) as unknown as CourseSummaryDto;

// ---------------------------------------------------------------- Provider giả (bọc MockProvider để đếm lệnh gọi)

const mockProvider = new MockProvider();
const generateJson = jest.fn(<T>(request: AiJsonRequest<T>) => mockProvider.generateJson(request));
const provider = { name: 'mock', model: mockProvider.model, generateJson } as unknown as AiProvider;

function resetQuotas(enabled: boolean, limits = { chat: 100, general: 100 }): void {
  for (const quota of [aiQuota, aiUserDailyQuota, aiGlobalQuota]) {
    quota.reset();
    quota.configure({ enabled, limits });
  }
}

beforeEach(() => {
  for (const model of Object.values(db)) for (const fn of Object.values(model)) fn.mockReset();
  findSummaries.mockReset();
  rankedIds.mockReset();
  generateJson.mockClear();
  db.aiContent.findUnique.mockResolvedValue(null);
  db.aiContent.upsert.mockResolvedValue({});
  db.course.findFirst.mockResolvedValue(courseRow);
  setAiProviderForTests(provider);
  resetQuotas(false);
});

afterAll(() => {
  setAiProviderForTests(undefined);
});

const cachedRow = (content: unknown, extra: Record<string, unknown> = {}) => ({
  content,
  model: 'cached-model',
  createdAt: new Date('2026-10-01T00:00:00.000Z'),
  expiresAt: null,
  ...extra,
});

// ---------------------------------------------------------------- runAi

describe('runAi', () => {
  it('returns the task result', async () => {
    await expect(aiService.runAi('u1', 'general', async () => 42)).resolves.toBe(42);
  });

  it('turns AI provider errors into ApiError with the right status and code', async () => {
    const run = (kind: ConstructorParameters<typeof AiProviderError>[0]) =>
      aiService.runAi('u1', 'general', async () => {
        throw new AiProviderError(kind, 'internal detail');
      });
    await expect(run('rate_limited')).rejects.toMatchObject({
      status: 429,
      code: 'AI_RATE_LIMITED',
    });
    await expect(run('blocked')).rejects.toMatchObject({ status: 422, code: 'AI_BLOCKED' });
    await expect(run('timeout')).rejects.toMatchObject({ status: 503, code: 'AI_UNAVAILABLE' });
    await expect(run('unavailable')).rejects.toMatchObject({ status: 503, code: 'AI_UNAVAILABLE' });
    await expect(run('bad_output')).rejects.toMatchObject({ status: 503, code: 'AI_UNAVAILABLE' });
  });

  it('keeps other errors untouched', async () => {
    const boom = new Error('db down');
    await expect(
      aiService.runAi('u1', 'general', async () => {
        throw boom;
      }),
    ).rejects.toBe(boom);
  });

  it('rejects with 429 and retryAfterSec without running the task when the quota is used up', async () => {
    resetQuotas(true, { chat: 1, general: 1 });
    const task = jest.fn().mockResolvedValue('ok');

    await aiService.runAi('u1', 'general', task);
    await expect(aiService.runAi('u1', 'general', task)).rejects.toMatchObject({
      status: 429,
      code: 'AI_RATE_LIMITED',
      details: { retryAfterSec: expect.any(Number) },
    });
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('gives the request back when the task fails so the user can retry', async () => {
    resetQuotas(true, { chat: 1, general: 1 });
    await expect(
      aiService.runAi('u1', 'general', async () => {
        throw new AiProviderError('unavailable', 'down');
      }),
    ).rejects.toMatchObject({ status: 503 });

    await expect(aiService.runAi('u1', 'general', async () => 'ok')).resolves.toBe('ok');
  });
});

// ---------------------------------------------------------------- loadCourseMaterial / loadLessonForAi

describe('loadCourseMaterial', () => {
  it('maps the course with its curriculum', async () => {
    const material = await aiService.loadCourseMaterial('course-1');
    expect(material).toMatchObject({
      id: 'course-1',
      title: 'UX Foundations',
      category: 'Design',
      teacher: 'Ada Lovelace',
      benefits: ['Understand users', 'Plan research', 'Test ideas'],
    });
    expect(material.sections).toHaveLength(2);
    expect(db.course.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'course-1', isPublished: true } }),
    );
  });

  it('throws 404 COURSE_NOT_FOUND for a missing or unpublished course', async () => {
    db.course.findFirst.mockResolvedValue(null);
    await expect(aiService.loadCourseMaterial('nope')).rejects.toMatchObject({
      status: 404,
      code: 'COURSE_NOT_FOUND',
    });
  });
});

describe('loadLessonForAi', () => {
  it('throws 404 LESSON_NOT_FOUND when the lesson does not exist', async () => {
    db.lesson.findUnique.mockResolvedValue(null);
    await expect(
      aiService.loadLessonForAi('u1', 'nope', { allowPreview: true }),
    ).rejects.toMatchObject({ status: 404, code: 'LESSON_NOT_FOUND' });
  });

  it('allows an enrolled user', async () => {
    db.lesson.findUnique.mockResolvedValue(lessonRow());
    db.enrollment.findUnique.mockResolvedValue({ id: 'e1' });

    const lesson = await aiService.loadLessonForAi('u1', 'l3', { allowPreview: false });

    expect(lesson).toEqual({
      id: 'l3',
      title: 'Wireframing key flows',
      content: NOTES,
      sectionTitle: 'Wireframes',
      courseTitle: 'UX Foundations',
      courseId: 'course-1',
    });
    expect(db.enrollment.findUnique).toHaveBeenCalledWith({
      where: { userId_courseId: { userId: 'u1', courseId: 'course-1' } },
      select: { id: true },
    });
  });

  it('throws 403 NOT_ENROLLED for a locked lesson', async () => {
    db.lesson.findUnique.mockResolvedValue(lessonRow());
    db.enrollment.findUnique.mockResolvedValue(null);
    await expect(
      aiService.loadLessonForAi('u1', 'l3', { allowPreview: true }),
    ).rejects.toMatchObject({ status: 403, code: 'NOT_ENROLLED' });
  });

  it('lets a non-enrolled user use a preview lesson only when previews are allowed', async () => {
    db.lesson.findUnique.mockResolvedValue(lessonRow({ isPreview: true }));
    db.enrollment.findUnique.mockResolvedValue(null);

    await expect(
      aiService.loadLessonForAi('u1', 'l3', { allowPreview: true }),
    ).resolves.toMatchObject({ id: 'l3' });
    await expect(
      aiService.loadLessonForAi('u1', 'l3', { allowPreview: false }),
    ).rejects.toMatchObject({ status: 403, code: 'NOT_ENROLLED' });
  });
});

// ---------------------------------------------------------------- getCourseSummary

describe('getCourseSummary', () => {
  it('generates, caches and returns the summary', async () => {
    const dto = await aiService.getCourseSummary('u1', 'course-1', 'en');

    expect(dto).toMatchObject({ courseId: 'course-1', lang: 'en', model: 'mock-ai-1' });
    expect(dto.overview).toContain('UX Foundations');
    expect(dto.sections.map((s) => s.title)).toEqual(['Getting started', 'Wireframes']);
    expect(Date.parse(dto.generatedAt)).not.toBeNaN();
    expect(generateJson).toHaveBeenCalledTimes(1);
    expect(generateJson.mock.calls[0]?.[0]).toMatchObject({ label: 'course_summary' });
    expect(db.aiContent.upsert).toHaveBeenCalledTimes(1);
  });

  it('generates in Vietnamese when asked to', async () => {
    const dto = await aiService.getCourseSummary('u1', 'course-1', 'vi');
    expect(dto.lang).toBe('vi');
    expect(dto.overview).toContain('khóa học');
  });

  it('serves a cached summary without calling the AI or using quota', async () => {
    resetQuotas(true, { chat: 1, general: 1 });
    const content = {
      overview: 'Cached overview',
      objectives: ['a', 'b', 'c'],
      sections: [{ title: 'Intro', summary: 'Cached' }],
      targetAudience: ['x', 'y'],
      outcomes: ['o1', 'o2', 'o3'],
    };
    db.aiContent.findUnique.mockResolvedValue(cachedRow(content));

    const first = await aiService.getCourseSummary('u1', 'course-1', 'en');
    const second = await aiService.getCourseSummary('u1', 'course-1', 'en');

    expect(first.overview).toBe('Cached overview');
    expect(second).toEqual(first);
    expect(first.model).toBe('cached-model');
    expect(first.generatedAt).toBe('2026-10-01T00:00:00.000Z');
    expect(generateJson).not.toHaveBeenCalled();
  });

  it('throws 404 COURSE_NOT_FOUND before touching the AI', async () => {
    db.course.findFirst.mockResolvedValue(null);
    await expect(aiService.getCourseSummary('u1', 'nope', 'en')).rejects.toMatchObject({
      status: 404,
      code: 'COURSE_NOT_FOUND',
    });
    expect(generateJson).not.toHaveBeenCalled();
  });

  it('returns 503 and caches nothing when the provider fails', async () => {
    generateJson.mockRejectedValueOnce(new AiProviderError('unavailable', 'down'));
    await expect(aiService.getCourseSummary('u1', 'course-1', 'en')).rejects.toMatchObject({
      status: 503,
      code: 'AI_UNAVAILABLE',
    });
    expect(db.aiContent.upsert).not.toHaveBeenCalled();
  });

  it('returns 429 AI_RATE_LIMITED when the user is out of quota', async () => {
    resetQuotas(true, { chat: 1, general: 0 });
    await expect(aiService.getCourseSummary('u1', 'course-1', 'en')).rejects.toMatchObject({
      status: 429,
      code: 'AI_RATE_LIMITED',
    });
    expect(generateJson).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------- getLessonSummary

describe('getLessonSummary', () => {
  beforeEach(() => {
    db.lesson.findUnique.mockResolvedValue(lessonRow());
    db.enrollment.findUnique.mockResolvedValue({ id: 'e1' });
  });

  it('summarises the lesson notes', async () => {
    const dto = await aiService.getLessonSummary('u1', 'l3', 'en');

    expect(dto).toMatchObject({ lessonId: 'l3', lang: 'en', model: 'mock-ai-1' });
    expect(dto.summary).toContain('Wireframes show the structure');
    expect(dto.keyPoints.length).toBeGreaterThanOrEqual(3);
    expect(generateJson.mock.calls[0]?.[0]).toMatchObject({ label: 'lesson_summary' });
    expect(db.aiContent.findUnique).toHaveBeenCalledWith({
      where: { kind_refId_lang: { kind: 'LESSON_SUMMARY', refId: 'l3', lang: 'en' } },
    });
  });

  it('throws 403 NOT_ENROLLED for a locked lesson without calling the AI', async () => {
    db.enrollment.findUnique.mockResolvedValue(null);
    await expect(aiService.getLessonSummary('u1', 'l3', 'en')).rejects.toMatchObject({
      status: 403,
      code: 'NOT_ENROLLED',
    });
    expect(generateJson).not.toHaveBeenCalled();
  });

  it('allows a preview lesson without enrollment', async () => {
    db.lesson.findUnique.mockResolvedValue(lessonRow({ isPreview: true }));
    db.enrollment.findUnique.mockResolvedValue(null);
    await expect(aiService.getLessonSummary('u1', 'l3', 'vi')).resolves.toMatchObject({
      lessonId: 'l3',
      lang: 'vi',
    });
  });

  it('throws 404 LESSON_NOT_FOUND for an unknown lesson', async () => {
    db.lesson.findUnique.mockResolvedValue(null);
    await expect(aiService.getLessonSummary('u1', 'nope', 'en')).rejects.toMatchObject({
      status: 404,
      code: 'LESSON_NOT_FOUND',
    });
  });
});

// ---------------------------------------------------------------- createLessonQuiz

describe('createLessonQuiz', () => {
  beforeEach(() => {
    db.lesson.findUnique.mockResolvedValue(lessonRow());
    db.enrollment.findUnique.mockResolvedValue({ id: 'e1' });
    db.lesson.findMany.mockResolvedValue([
      { title: 'What is UX?', content: NOTES },
      { title: 'The process', content: null },
    ]);
  });

  it('creates a 5-question quiz using the other lessons as distractors', async () => {
    const dto = await aiService.createLessonQuiz('u1', 'l3', 'en');

    expect(dto).toMatchObject({ lessonId: 'l3', lang: 'en' });
    expect(dto.questions).toHaveLength(5);
    for (const question of dto.questions) {
      expect(question.options).toHaveLength(4);
      expect(question.correctIndex).toBeGreaterThanOrEqual(0);
      expect(question.correctIndex).toBeLessThan(4);
    }
    expect(db.lesson.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { section: { courseId: 'course-1' }, id: { not: 'l3' } } }),
    );
    expect(db.aiContent.upsert).toHaveBeenCalledTimes(1);
  });

  it('does not allow preview access: the quiz needs enrollment', async () => {
    db.lesson.findUnique.mockResolvedValue(lessonRow({ isPreview: true }));
    db.enrollment.findUnique.mockResolvedValue(null);
    await expect(aiService.createLessonQuiz('u1', 'l3', 'en')).rejects.toMatchObject({
      status: 403,
      code: 'NOT_ENROLLED',
    });
  });

  it('returns the cached quiz on a second request', async () => {
    const first = await aiService.createLessonQuiz('u1', 'l3', 'en');
    const stored = db.aiContent.upsert.mock.calls[0]?.[0] as { create: { content: unknown } };
    db.aiContent.findUnique.mockResolvedValue(cachedRow(stored.create.content));
    generateJson.mockClear();

    const second = await aiService.createLessonQuiz('u1', 'l3', 'en');

    expect(second.questions).toEqual(first.questions);
    expect(generateJson).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------- getRecommendations

describe('getRecommendations', () => {
  const enrollmentRow = {
    progressPercent: 30,
    course: { title: 'UX', category: { name: 'Design' } },
  };
  const bookmarkRow = { course: { title: 'Python', category: { name: 'Code' } } };

  beforeEach(() => {
    rankedIds.mockResolvedValue(['a', 'b', 'c', 'd']);
    db.course.findMany.mockResolvedValue(['a', 'b', 'c', 'd'].map((id) => candidateRow(id)));
    db.enrollment.findMany.mockResolvedValue([enrollmentRow]);
    db.bookmark.findMany.mockResolvedValue([bookmarkRow]);
    findSummaries.mockImplementation(async (ids: string[]) => ids.map(summaryOf));
  });

  it('builds a personalised path with a reason per course and caches it for 24 hours', async () => {
    const before = Date.now();

    const dto = await aiService.getRecommendations('u1', 'en');

    expect(dto.lang).toBe('en');
    expect(dto.model).toBe('mock-ai-1');
    expect(dto.encouragement).toBeTruthy();
    expect(dto.items.map((item) => item.course.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(dto.items.every((item) => item.reason.length > 0)).toBe(true);
    expect(rankedIds).toHaveBeenCalledWith('u1');
    expect(generateJson.mock.calls[0]?.[0]).toMatchObject({ label: 'recommendations' });

    const call = db.aiContent.upsert.mock.calls[0]?.[0] as {
      create: { kind: string; refId: string; expiresAt: Date };
    };
    expect(call.create).toMatchObject({ kind: 'RECOMMENDATIONS', refId: 'u1' });
    expect(call.create.expiresAt.getTime()).toBeGreaterThanOrEqual(
      before + aiService.RECOMMENDATIONS_TTL_MS,
    );
  });

  it('only sends the top candidates to the AI', async () => {
    const ids = Array.from({ length: 30 }, (_, i) => `c${i}`);
    rankedIds.mockResolvedValue(ids);
    db.course.findMany.mockResolvedValue(ids.slice(0, 12).map((id) => candidateRow(id)));

    await aiService.getRecommendations('u1', 'en');

    expect(db.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ids.slice(0, aiService.CANDIDATE_LIMIT) }, isPublished: true },
      }),
    );
  });

  it('returns an empty path without calling the AI or caching when nothing is left to recommend', async () => {
    rankedIds.mockResolvedValue([]);

    const dto = await aiService.getRecommendations('u1', 'vi');

    expect(dto.items).toEqual([]);
    expect(dto.encouragement).toContain('Cố lên');
    expect(dto.model).toBe('mock-ai-1');
    expect(generateJson).not.toHaveBeenCalled();
    expect(db.aiContent.upsert).not.toHaveBeenCalled();
  });

  it('skips candidates that were unpublished between the two queries', async () => {
    db.course.findMany.mockResolvedValue([candidateRow('a'), candidateRow('c')]);
    const dto = await aiService.getRecommendations('u1', 'en');
    expect(dto.items.map((item) => item.course.id)).toEqual(['a', 'c']);
  });

  it('replaces invented course ids from the model', async () => {
    generateJson.mockResolvedValueOnce({
      data: {
        encouragement: 'Go!',
        items: [
          { courseId: 'made-up', reason: 'nope' },
          { courseId: 'b', reason: 'because b' },
        ],
      },
      model: 'gemini-test',
    });

    const dto = await aiService.getRecommendations('u1', 'en');

    expect(dto.model).toBe('gemini-test');
    expect(dto.encouragement).toBe('Go!');
    expect(dto.items.map((item) => item.course.id)).toEqual(['b', 'a', 'c']);
    expect(dto.items[0]?.reason).toBe('because b');
  });

  describe('cache', () => {
    const cached = {
      encouragement: 'Cached encouragement',
      items: [
        { courseId: 'x', reason: 'cached x' },
        { courseId: 'y', reason: 'cached y' },
      ],
    };

    it('reuses the cached path while the user has not enrolled in any of its courses', async () => {
      db.aiContent.findUnique.mockResolvedValue(cachedRow(cached));
      db.enrollment.count.mockResolvedValue(0);

      const dto = await aiService.getRecommendations('u1', 'en');

      expect(dto.encouragement).toBe('Cached encouragement');
      expect(dto.items.map((item) => [item.course.id, item.reason])).toEqual([
        ['x', 'cached x'],
        ['y', 'cached y'],
      ]);
      expect(generateJson).not.toHaveBeenCalled();
      expect(db.enrollment.count).toHaveBeenCalledWith({
        where: { userId: 'u1', courseId: { in: ['x', 'y'] } },
      });
    });

    it('regenerates the path after the user enrolled in one of its courses', async () => {
      db.aiContent.findUnique.mockResolvedValue(cachedRow(cached));
      db.enrollment.count.mockResolvedValue(1);

      const dto = await aiService.getRecommendations('u1', 'en');

      expect(generateJson).toHaveBeenCalledTimes(1);
      expect(dto.items.map((item) => item.course.id)).toEqual(['a', 'b', 'c', 'd']);
    });

    it('drops cached courses that are no longer published', async () => {
      db.aiContent.findUnique.mockResolvedValue(cachedRow(cached));
      db.enrollment.count.mockResolvedValue(0);
      findSummaries.mockResolvedValue([summaryOf('y')]);

      const dto = await aiService.getRecommendations('u1', 'en');

      expect(dto.items.map((item) => item.course.id)).toEqual(['y']);
    });
  });
});
