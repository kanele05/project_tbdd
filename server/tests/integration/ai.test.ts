import http from 'node:http';
import type { AddressInfo } from 'node:net';

import { createApp } from '@/app';
import { aiGlobalQuota, aiQuota, aiUserDailyQuota, setAiProviderForTests } from '@/lib/ai';
import { AiProviderError } from '@/lib/ai/errors';
import { MockProvider } from '@/lib/ai/mock.provider';
import type { AiProvider, AiTextRequest } from '@/lib/ai/types';
import { prisma } from '@/lib/prisma';

import { authHeader } from '../helpers/authHelper';
import {
  createCourse,
  createCourseWithLessons,
  createEnrollment,
  createUser,
} from '../helpers/factories';
import { resetDb } from '../helpers/resetDb';
import { API, createTestApi } from '../helpers/testApp';

const api = createTestApi();

const NOTES = [
  'Wireframes show the structure of a screen before any visual design is added.',
  'Start with the user goal and the main task the screen must support.',
  'Keep the layout simple so people can scan it quickly.',
  'Test the structure early, because it is cheap to change on paper.',
].join('\n');

function resetQuotas(enabled: boolean, limits = { chat: 20, general: 30 }): void {
  for (const quota of [aiQuota, aiUserDailyQuota, aiGlobalQuota]) {
    quota.reset();
    quota.configure({ enabled, limits });
  }
}

beforeEach(async () => {
  await resetDb();
  resetQuotas(false);
  setAiProviderForTests(undefined);
});

afterAll(() => {
  resetQuotas(false);
  setAiProviderForTests(undefined);
});

// ---------------------------------------------------------------- Dữ liệu & tiện ích

/** Khóa 2 chương x 2 bài (bài 1 là xem thử) có ghi chú chữ + một học viên đã ghi danh + một người ngoài. */
async function setup() {
  const { course, lessons } = await createCourseWithLessons({
    sections: 2,
    lessonsPerSection: 2,
    previewCount: 1,
    course: { title: 'UX Foundation' },
  });
  await prisma.lesson.updateMany({
    where: {
      sectionId: {
        in: (await prisma.section.findMany({ where: { courseId: course.id } })).map((s) => s.id),
      },
    },
    data: { content: NOTES },
  });
  const student = await createUser({ fullName: 'Student One' });
  const other = await createUser({ fullName: 'Student Two' });
  const outsider = await createUser({ fullName: 'Outsider' });
  await createEnrollment(student.id, course.id);
  await createEnrollment(other.id, course.id);
  const [previewLesson, lockedLesson] = lessons;
  if (!previewLesson || !lockedLesson) throw new Error('lessons not created');
  return { course, student, other, outsider, previewLesson, lockedLesson };
}

type SseEvent = { event: string; data: Record<string, unknown> };

function parseSse(text: string): SseEvent[] {
  return text
    .split('\n\n')
    .filter((block) => block.trim() !== '')
    .map((block) => {
      const lines = block.split('\n');
      const event = lines.find((l) => l.startsWith('event: '))?.slice('event: '.length) ?? '';
      const data = lines.find((l) => l.startsWith('data: '))?.slice('data: '.length) ?? 'null';
      return { event, data: JSON.parse(data) as Record<string, unknown> };
    });
}

function fakeProvider(overrides: Partial<AiProvider>): AiProvider {
  const mock = new MockProvider();
  return {
    name: 'mock',
    model: mock.model,
    generateText: (request) => mock.generateText(request),
    streamText: (request) => mock.streamText(request),
    generateJson: (request) => mock.generateJson(request),
    ...overrides,
  };
}

async function countContent(): Promise<number> {
  return prisma.aiContent.count();
}

async function countMessages(): Promise<number> {
  return prisma.aiChatMessage.count();
}

// ---------------------------------------------------------------- 401

describe('authentication', () => {
  it.each([
    ['get', '/courses/c1/ai/summary'],
    ['get', '/lessons/l1/ai/summary'],
    ['post', '/lessons/l1/ai/quiz'],
    ['get', '/me/ai/recommendations'],
    ['post', '/courses/c1/ai/chat'],
    ['get', '/courses/c1/ai/chat'],
    ['delete', '/courses/c1/ai/chat'],
  ] as const)('returns 401 UNAUTHORIZED for %s %s without a token', async (method, path) => {
    const res = await api[method](`${API}${path}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 for an invalid token', async () => {
    const res = await api.get(`${API}/me/ai/recommendations`).set('Authorization', 'Bearer nope');
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------- GET /courses/:id/ai/summary

describe('GET /courses/:id/ai/summary', () => {
  it('returns an AI summary of the curriculum (no enrollment needed)', async () => {
    const { course, outsider } = await setup();

    const res = await api.get(`${API}/courses/${course.id}/ai/summary`).set(authHeader(outsider));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      courseId: course.id,
      lang: 'en',
      overview: expect.stringContaining('UX Foundation'),
      objectives: expect.any(Array),
      sections: [
        { title: 'Section 1', summary: expect.any(String) },
        { title: 'Section 2', summary: expect.any(String) },
      ],
      targetAudience: expect.any(Array),
      outcomes: expect.any(Array),
      model: 'mock-ai-1',
      generatedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/),
    });
    expect(res.body.data.objectives.length).toBeGreaterThanOrEqual(3);
    expect(res.body.data.targetAudience.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data.outcomes.length).toBeGreaterThanOrEqual(3);
  });

  it('caches the result in the database and returns the same content again', async () => {
    const { course, student } = await setup();
    const generate = jest.fn();
    const mock = new MockProvider();
    setAiProviderForTests(
      fakeProvider({
        generateJson: (request) => {
          generate();
          return mock.generateJson(request);
        },
      }),
    );

    const first = await api.get(`${API}/courses/${course.id}/ai/summary`).set(authHeader(student));
    const second = await api.get(`${API}/courses/${course.id}/ai/summary`).set(authHeader(student));

    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(await countContent()).toBe(1);
    const row = await prisma.aiContent.findFirstOrThrow();
    expect(row).toMatchObject({ kind: 'COURSE_SUMMARY', refId: course.id, lang: 'en' });
  });

  it('shares the cached summary between users', async () => {
    const { course, student, outsider } = await setup();
    const a = await api.get(`${API}/courses/${course.id}/ai/summary`).set(authHeader(student));
    const b = await api.get(`${API}/courses/${course.id}/ai/summary`).set(authHeader(outsider));
    expect(b.body.data.generatedAt).toBe(a.body.data.generatedAt);
    expect(await countContent()).toBe(1);
  });

  it('picks the language from ?lang, then Accept-Language, then English, with a cache entry per language', async () => {
    const { course, student } = await setup();
    const url = `${API}/courses/${course.id}/ai/summary`;

    const vi = await api.get(`${url}?lang=vi`).set(authHeader(student));
    const header = await api
      .get(url)
      .set(authHeader(student))
      .set('Accept-Language', 'vi-VN,vi;q=0.9,en;q=0.8');
    const override = await api
      .get(`${url}?lang=en`)
      .set(authHeader(student))
      .set('Accept-Language', 'vi');
    const fallback = await api.get(url).set(authHeader(student));

    expect(vi.body.data.lang).toBe('vi');
    expect(vi.body.data.overview).toContain('khóa học');
    expect(header.body.data.lang).toBe('vi');
    expect(header.body.data.generatedAt).toBe(vi.body.data.generatedAt);
    expect(override.body.data.lang).toBe('en');
    expect(fallback.body.data.lang).toBe('en');
    expect(await countContent()).toBe(2);
  });

  it('returns 400 for an unsupported language', async () => {
    const { course, student } = await setup();
    const res = await api
      .get(`${API}/courses/${course.id}/ai/summary?lang=fr`)
      .set(authHeader(student));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 COURSE_NOT_FOUND for an unknown or unpublished course', async () => {
    const { student } = await setup();
    const unpublished = await createCourse({ isPublished: false });

    const unknown = await api.get(`${API}/courses/nope/ai/summary`).set(authHeader(student));
    const hidden = await api
      .get(`${API}/courses/${unpublished.id}/ai/summary`)
      .set(authHeader(student));

    for (const res of [unknown, hidden]) {
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('COURSE_NOT_FOUND');
    }
    expect(await countContent()).toBe(0);
  });

  it('returns 429 AI_RATE_LIMITED with retryAfterSec when the hourly quota is used up, but cache hits stay free', async () => {
    const { course, student } = await setup();
    const second = await createCourse({ title: 'Second course' });
    resetQuotas(true, { chat: 5, general: 1 });

    const ok = await api.get(`${API}/courses/${course.id}/ai/summary`).set(authHeader(student));
    const cached = await api.get(`${API}/courses/${course.id}/ai/summary`).set(authHeader(student));
    const limited = await api
      .get(`${API}/courses/${second.id}/ai/summary`)
      .set(authHeader(student));

    expect(ok.status).toBe(200);
    expect(cached.status).toBe(200);
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe('AI_RATE_LIMITED');
    expect(limited.body.error.details.retryAfterSec).toBeGreaterThan(0);
    expect(await countContent()).toBe(1);
  });

  it('applies the daily per-user and server-wide caps', async () => {
    const { course, student, outsider } = await setup();
    const third = await createUser();
    const c2 = await createCourse();
    const c3 = await createCourse();
    aiUserDailyQuota.configure({ enabled: true, limits: { general: 1 } });
    aiGlobalQuota.configure({ enabled: true, limits: { general: 2 } });
    const get = (courseId: string, user: { id: string }) =>
      api.get(`${API}/courses/${courseId}/ai/summary`).set(authHeader(user));

    expect((await get(course.id, student)).status).toBe(200);

    const userLimited = await get(c2.id, student); // student đã dùng hết lượt trong ngày
    expect(userLimited.status).toBe(429);
    expect(userLimited.body.error.code).toBe('AI_RATE_LIMITED');

    expect((await get(c2.id, outsider)).status).toBe(200); // lượt cuối của cả server

    const globalLimited = await get(c3.id, third); // third còn lượt riêng nhưng server đã hết
    expect(globalLimited.status).toBe(429);
    expect(globalLimited.body.error.code).toBe('AI_RATE_LIMITED');
  });

  it('returns 503 AI_UNAVAILABLE without caching or consuming quota when the provider is down', async () => {
    const { course, student } = await setup();
    resetQuotas(true, { chat: 5, general: 1 });
    setAiProviderForTests(
      fakeProvider({
        generateJson: () =>
          Promise.reject(new AiProviderError('unavailable', 'GEMINI_API_KEY is not configured')),
      }),
    );

    const down = await api.get(`${API}/courses/${course.id}/ai/summary`).set(authHeader(student));
    expect(down.status).toBe(503);
    expect(down.body.error.code).toBe('AI_UNAVAILABLE');
    expect(JSON.stringify(down.body)).not.toContain('GEMINI_API_KEY');
    expect(await countContent()).toBe(0);

    setAiProviderForTests(undefined);
    const retry = await api.get(`${API}/courses/${course.id}/ai/summary`).set(authHeader(student));
    expect(retry.status).toBe(200);
  });

  it('returns 422 AI_BLOCKED when the safety filter blocks the request', async () => {
    const { course, student } = await setup();
    setAiProviderForTests(
      fakeProvider({
        generateJson: () => Promise.reject(new AiProviderError('blocked', 'SAFETY')),
      }),
    );
    const res = await api.get(`${API}/courses/${course.id}/ai/summary`).set(authHeader(student));
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('AI_BLOCKED');
  });

  it('returns 503 when the model keeps returning invalid output', async () => {
    const { course, student } = await setup();
    setAiProviderForTests(
      fakeProvider({
        generateJson: () => Promise.reject(new AiProviderError('bad_output', 'invalid JSON')),
      }),
    );
    const res = await api.get(`${API}/courses/${course.id}/ai/summary`).set(authHeader(student));
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('AI_UNAVAILABLE');
  });
});

// ---------------------------------------------------------------- GET /lessons/:id/ai/summary

describe('GET /lessons/:id/ai/summary', () => {
  it('summarises a lesson for an enrolled student', async () => {
    const { student, lockedLesson } = await setup();

    const res = await api
      .get(`${API}/lessons/${lockedLesson.id}/ai/summary`)
      .set(authHeader(student));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      lessonId: lockedLesson.id,
      lang: 'en',
      summary: expect.stringContaining('Wireframes show the structure'),
      keyPoints: expect.any(Array),
      model: 'mock-ai-1',
      generatedAt: expect.any(String),
    });
    expect(res.body.data.keyPoints.length).toBeGreaterThanOrEqual(3);
  });

  it('caches per lesson and language', async () => {
    const { student, lockedLesson } = await setup();
    const url = `${API}/lessons/${lockedLesson.id}/ai/summary`;

    const first = await api.get(url).set(authHeader(student));
    const again = await api.get(url).set(authHeader(student));
    const vi = await api.get(`${url}?lang=vi`).set(authHeader(student));

    expect(again.body).toEqual(first.body);
    expect(vi.body.data.lang).toBe('vi');
    expect(await countContent()).toBe(2);
  });

  it('lets a non-enrolled user summarise a preview lesson', async () => {
    const { outsider, previewLesson } = await setup();
    const res = await api
      .get(`${API}/lessons/${previewLesson.id}/ai/summary`)
      .set(authHeader(outsider));
    expect(res.status).toBe(200);
  });

  it('returns 403 NOT_ENROLLED for a locked lesson of a course the user has not joined', async () => {
    const { outsider, lockedLesson } = await setup();
    const res = await api
      .get(`${API}/lessons/${lockedLesson.id}/ai/summary`)
      .set(authHeader(outsider));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_ENROLLED');
    expect(await countContent()).toBe(0);
  });

  it('returns 404 LESSON_NOT_FOUND for an unknown lesson', async () => {
    const { student } = await setup();
    const res = await api.get(`${API}/lessons/nope/ai/summary`).set(authHeader(student));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('LESSON_NOT_FOUND');
  });

  it('returns 400 for an unsupported language', async () => {
    const { student, lockedLesson } = await setup();
    const res = await api
      .get(`${API}/lessons/${lockedLesson.id}/ai/summary?lang=xx`)
      .set(authHeader(student));
    expect(res.status).toBe(400);
  });

  it('still works for a lesson without written notes', async () => {
    const { student, lockedLesson } = await setup();
    await prisma.lesson.update({ where: { id: lockedLesson.id }, data: { content: null } });
    const res = await api
      .get(`${API}/lessons/${lockedLesson.id}/ai/summary`)
      .set(authHeader(student));
    expect(res.status).toBe(200);
    expect(res.body.data.keyPoints).toHaveLength(3);
  });

  it('returns 429 when the quota is used up', async () => {
    const { student, lockedLesson, previewLesson } = await setup();
    resetQuotas(true, { chat: 5, general: 1 });
    await api.get(`${API}/lessons/${lockedLesson.id}/ai/summary`).set(authHeader(student));
    const res = await api
      .get(`${API}/lessons/${previewLesson.id}/ai/summary`)
      .set(authHeader(student));
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('AI_RATE_LIMITED');
  });
});

// ---------------------------------------------------------------- POST /lessons/:id/ai/quiz

describe('POST /lessons/:id/ai/quiz', () => {
  it('creates a 5-question multiple-choice quiz', async () => {
    const { student, lockedLesson } = await setup();

    const res = await api
      .post(`${API}/lessons/${lockedLesson.id}/ai/quiz`)
      .set(authHeader(student));

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      lessonId: lockedLesson.id,
      lang: 'en',
      model: 'mock-ai-1',
    });
    expect(res.body.data.questions).toHaveLength(5);
    for (const q of res.body.data.questions as {
      question: string;
      options: string[];
      correctIndex: number;
      explanation: string;
    }[]) {
      expect(q.question).toBeTruthy();
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(Number.isInteger(q.correctIndex)).toBe(true);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThanOrEqual(3);
      expect(q.explanation).toBeTruthy();
    }
  });

  it('returns the cached quiz (same questions) on the next request and in other languages separately', async () => {
    const { student, other, lockedLesson } = await setup();
    const url = `${API}/lessons/${lockedLesson.id}/ai/quiz`;

    const first = await api.post(url).set(authHeader(student));
    const second = await api.post(url).set(authHeader(other));
    const vi = await api.post(`${url}?lang=vi`).set(authHeader(student));

    expect(second.body).toEqual(first.body);
    expect(vi.body.data.lang).toBe('vi');
    expect(vi.body.data.questions[0].question).toContain('Chủ đề chính');
    expect(await countContent()).toBe(2);
  });

  it('requires enrollment even for preview lessons (403 NOT_ENROLLED)', async () => {
    const { outsider, previewLesson } = await setup();
    const res = await api
      .post(`${API}/lessons/${previewLesson.id}/ai/quiz`)
      .set(authHeader(outsider));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_ENROLLED');
  });

  it('returns 404 LESSON_NOT_FOUND for an unknown lesson', async () => {
    const { student } = await setup();
    const res = await api.post(`${API}/lessons/nope/ai/quiz`).set(authHeader(student));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('LESSON_NOT_FOUND');
  });

  it('returns 400 for an unsupported language', async () => {
    const { student, lockedLesson } = await setup();
    const res = await api
      .post(`${API}/lessons/${lockedLesson.id}/ai/quiz?lang=de`)
      .set(authHeader(student));
    expect(res.status).toBe(400);
  });

  it('returns 429 when the quota is used up', async () => {
    const { student, lockedLesson, previewLesson } = await setup();
    resetQuotas(true, { chat: 5, general: 1 });
    await api.post(`${API}/lessons/${lockedLesson.id}/ai/quiz`).set(authHeader(student));
    const res = await api
      .post(`${API}/lessons/${previewLesson.id}/ai/quiz`)
      .set(authHeader(student));
    expect(res.status).toBe(429);
  });
});

// ---------------------------------------------------------------- GET /me/ai/recommendations

describe('GET /me/ai/recommendations', () => {
  async function seedCatalog(count: number) {
    const courses = [];
    for (let i = 0; i < count; i += 1) {
      courses.push(
        await createCourse({ title: `Catalog ${i}`, ratingAvg: 4.9 - i * 0.1, ratingCount: 50 }),
      );
    }
    return courses;
  }

  it('returns a learning path of courses the user has not enrolled in, each with a reason', async () => {
    const { course, student } = await setup();
    const catalog = await seedCatalog(5);

    const res = await api.get(`${API}/me/ai/recommendations`).set(authHeader(student));

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ lang: 'en', model: 'mock-ai-1' });
    expect(res.body.data.encouragement).toBeTruthy();
    expect(res.body.data.generatedAt).toEqual(expect.any(String));
    const items = res.body.data.items as {
      course: { id: string; title: string };
      reason: string;
    }[];
    expect(items.length).toBeGreaterThanOrEqual(3);
    expect(items.length).toBeLessThanOrEqual(5);
    const ids = items.map((i) => i.course.id);
    expect(ids).not.toContain(course.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of items) {
      expect(catalog.map((c) => c.id)).toContain(item.course.id);
      expect(item.reason).toBeTruthy();
      expect(item.course).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          title: expect.any(String),
          priceCents: expect.any(Number),
          isBookmarked: false,
        }),
      );
    }
  });

  it('caches the path per user and language', async () => {
    const { student, other } = await setup();
    await seedCatalog(4);

    const first = await api.get(`${API}/me/ai/recommendations`).set(authHeader(student));
    const again = await api.get(`${API}/me/ai/recommendations`).set(authHeader(student));
    const vi = await api.get(`${API}/me/ai/recommendations?lang=vi`).set(authHeader(student));
    const forOther = await api.get(`${API}/me/ai/recommendations`).set(authHeader(other));

    expect(again.body).toEqual(first.body);
    expect(vi.body.data.lang).toBe('vi');
    expect(forOther.body.data.generatedAt).not.toBe(first.body.data.generatedAt);
    expect(await countContent()).toBe(3);
  });

  it('builds a new path after the user enrolls in one of the recommended courses', async () => {
    const { student } = await setup();
    await seedCatalog(6);

    const first = await api.get(`${API}/me/ai/recommendations`).set(authHeader(student));
    const firstIds = (first.body.data.items as { course: { id: string } }[]).map(
      (i) => i.course.id,
    );
    const bought = firstIds[0] as string;
    await createEnrollment(student.id, bought);

    const next = await api.get(`${API}/me/ai/recommendations`).set(authHeader(student));
    const nextIds = (next.body.data.items as { course: { id: string } }[]).map((i) => i.course.id);

    expect(nextIds).not.toContain(bought);
    expect(nextIds.length).toBeGreaterThanOrEqual(3);
  });

  it('returns an empty path (without calling the AI) when there is nothing left to recommend', async () => {
    const { student } = await setup();
    const generate = jest.fn();
    setAiProviderForTests(fakeProvider({ generateJson: generate }));

    const res = await api.get(`${API}/me/ai/recommendations?lang=vi`).set(authHeader(student));

    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([]);
    expect(res.body.data.encouragement).toBeTruthy();
    expect(generate).not.toHaveBeenCalled();
    expect(await countContent()).toBe(0);
  });

  it('works for a brand-new user with no enrollments', async () => {
    const newcomer = await createUser();
    await seedCatalog(3);
    const res = await api.get(`${API}/me/ai/recommendations`).set(authHeader(newcomer));
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(3);
  });

  it('returns 400 for an unsupported language', async () => {
    const user = await createUser();
    const res = await api.get(`${API}/me/ai/recommendations?lang=jp`).set(authHeader(user));
    expect(res.status).toBe(400);
  });

  it('returns 429 when the quota is used up and 503 when the AI is down', async () => {
    const user = await createUser();
    await seedCatalog(3);
    resetQuotas(true, { chat: 5, general: 0 });
    const limited = await api.get(`${API}/me/ai/recommendations`).set(authHeader(user));
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe('AI_RATE_LIMITED');

    resetQuotas(false);
    setAiProviderForTests(
      fakeProvider({ generateJson: () => Promise.reject(new AiProviderError('timeout', 'slow')) }),
    );
    const down = await api.get(`${API}/me/ai/recommendations`).set(authHeader(user));
    expect(down.status).toBe(503);
    expect(down.body.error.code).toBe('AI_UNAVAILABLE');
  });
});

// ---------------------------------------------------------------- POST /courses/:id/ai/chat (SSE)

describe('POST /courses/:id/ai/chat', () => {
  const chatUrl = (courseId: string, query = '') => `${API}/courses/${courseId}/ai/chat${query}`;

  it('streams the answer as Server-Sent Events and stores the conversation', async () => {
    const { course, student } = await setup();

    const res = await api
      .post(chatUrl(course.id))
      .set(authHeader(student))
      .send({ message: 'How do I start wireframing?' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');
    expect(res.headers['cache-control']).toContain('no-cache');
    expect(res.headers['cache-control']).toContain('no-transform');
    expect(res.headers['x-accel-buffering']).toBe('no');
    expect(res.headers['content-encoding']).toBeUndefined();

    const events = parseSse(res.text);
    const deltas = events.filter((e) => e.event === 'delta');
    const last = events[events.length - 1];
    expect(deltas.length).toBeGreaterThan(1);
    expect(events.map((e) => e.event)).toEqual([...deltas.map(() => 'delta'), 'done']);
    expect(last?.data).toEqual({ messageId: expect.any(String) });
    const answer = deltas.map((e) => e.data.text as string).join('');
    expect(answer.startsWith('[Demo AI]')).toBe(true);
    expect(answer).toContain('Lesson');

    const stored = await prisma.aiChatMessage.findMany({ orderBy: { createdAt: 'asc' } });
    expect(stored.map((m) => [m.role, m.userId, m.courseId])).toEqual([
      ['USER', student.id, course.id],
      ['ASSISTANT', student.id, course.id],
    ]);
    expect(stored[0]?.content).toBe('How do I start wireframing?');
    expect(stored[1]?.content).toBe(answer);
    expect(stored[1]?.id).toBe(last?.data.messageId);
  });

  it('answers in Vietnamese for lang=vi', async () => {
    const { course, student } = await setup();
    const res = await api
      .post(chatUrl(course.id, '?lang=vi'))
      .set(authHeader(student))
      .send({ message: 'wireframes là gì?' });
    const answer = parseSse(res.text)
      .filter((e) => e.event === 'delta')
      .map((e) => e.data.text as string)
      .join('');
    expect(answer).toMatch(/Mình không tìm thấy|Bài \d+/);
  });

  it('sends the earlier conversation of this user as context for the next question', async () => {
    const { course, student, other } = await setup();
    const histories: number[] = [];
    const mock = new MockProvider();
    setAiProviderForTests(
      fakeProvider({
        streamText: (request: AiTextRequest) => {
          histories.push(request.history?.length ?? 0);
          return mock.streamText(request);
        },
      }),
    );

    await api.post(chatUrl(course.id)).set(authHeader(student)).send({ message: 'first question' });
    await api
      .post(chatUrl(course.id))
      .set(authHeader(student))
      .send({ message: 'second question' });
    await api.post(chatUrl(course.id)).set(authHeader(other)).send({ message: 'someone else' });

    expect(histories).toEqual([0, 2, 0]);
  });

  it.each([
    ['an empty message', { message: '   ' }],
    ['a missing message', {}],
    ['a message that is not a string', { message: 42 }],
    ['a message longer than 1000 characters', { message: 'x'.repeat(1001) }],
  ])('returns 400 VALIDATION_ERROR for %s', async (_name, body) => {
    const { course, student } = await setup();
    const res = await api.post(chatUrl(course.id)).set(authHeader(student)).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(await countMessages()).toBe(0);
  });

  it('accepts a message of exactly 1000 characters', async () => {
    const { course, student } = await setup();
    const res = await api
      .post(chatUrl(course.id))
      .set(authHeader(student))
      .send({ message: 'x'.repeat(1000) });
    expect(res.status).toBe(200);
  });

  it('returns 400 for an unsupported language', async () => {
    const { course, student } = await setup();
    const res = await api
      .post(chatUrl(course.id, '?lang=fr'))
      .set(authHeader(student))
      .send({ message: 'hi' });
    expect(res.status).toBe(400);
  });

  it('returns a normal JSON 403 NOT_ENROLLED (not a stream) for a user who has not enrolled', async () => {
    const { course, outsider } = await setup();
    const res = await api
      .post(chatUrl(course.id))
      .set(authHeader(outsider))
      .send({ message: 'hi' });
    expect(res.status).toBe(403);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.body.error.code).toBe('NOT_ENROLLED');
    expect(await countMessages()).toBe(0);
  });

  it('returns 404 COURSE_NOT_FOUND for an unknown course', async () => {
    const { student } = await setup();
    const res = await api.post(chatUrl('nope')).set(authHeader(student)).send({ message: 'hi' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('COURSE_NOT_FOUND');
  });

  it('returns a JSON 429 AI_RATE_LIMITED before streaming when the chat quota is used up', async () => {
    const { course, student, other } = await setup();
    resetQuotas(true, { chat: 1, general: 10 });

    const ok = await api.post(chatUrl(course.id)).set(authHeader(student)).send({ message: 'one' });
    const limited = await api
      .post(chatUrl(course.id))
      .set(authHeader(student))
      .send({ message: 'two' });
    const otherUser = await api
      .post(chatUrl(course.id))
      .set(authHeader(other))
      .send({ message: 'hi' });

    expect(ok.status).toBe(200);
    expect(limited.status).toBe(429);
    expect(limited.headers['content-type']).toContain('application/json');
    expect(limited.body.error.code).toBe('AI_RATE_LIMITED');
    expect(limited.body.error.details.retryAfterSec).toBeGreaterThan(0);
    expect(otherUser.status).toBe(200);
    expect(await countMessages()).toBe(4); // lượt bị chặn không lưu gì
  });

  it('does not use up the chat quota when the AI fails before the first chunk', async () => {
    const { course, student } = await setup();
    resetQuotas(true, { chat: 1, general: 10 });
    setAiProviderForTests(
      fakeProvider({
        streamText: () => ({
          // eslint-disable-next-line require-yield
          async *[Symbol.asyncIterator]() {
            throw new AiProviderError('unavailable', 'down');
          },
        }),
      }),
    );

    const down = await api
      .post(chatUrl(course.id))
      .set(authHeader(student))
      .send({ message: 'hi' });
    expect(down.status).toBe(503);
    expect(down.body.error.code).toBe('AI_UNAVAILABLE');
    expect(await countMessages()).toBe(0);

    setAiProviderForTests(undefined);
    const retry = await api
      .post(chatUrl(course.id))
      .set(authHeader(student))
      .send({ message: 'hi' });
    expect(retry.status).toBe(200);
  });

  it('returns a JSON 422 AI_BLOCKED when the first chunk is blocked', async () => {
    const { course, student } = await setup();
    setAiProviderForTests(
      fakeProvider({
        streamText: () => ({
          // eslint-disable-next-line require-yield
          async *[Symbol.asyncIterator]() {
            throw new AiProviderError('blocked', 'SAFETY');
          },
        }),
      }),
    );
    const res = await api.post(chatUrl(course.id)).set(authHeader(student)).send({ message: 'hi' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('AI_BLOCKED');
  });

  it('reports an error that happens mid-stream as an SSE "error" event and saves nothing', async () => {
    const { course, student } = await setup();
    setAiProviderForTests(
      fakeProvider({
        streamText: () => ({
          async *[Symbol.asyncIterator]() {
            yield 'Partial answer ';
            throw new AiProviderError('timeout', 'slow');
          },
        }),
      }),
    );

    const res = await api.post(chatUrl(course.id)).set(authHeader(student)).send({ message: 'hi' });

    expect(res.status).toBe(200);
    expect(parseSse(res.text)).toEqual([
      { event: 'delta', data: { text: 'Partial answer ' } },
      {
        event: 'error',
        data: { code: 'AI_UNAVAILABLE', message: expect.any(String) },
      },
    ]);
    expect(await countMessages()).toBe(0);
  });

  it('hides unexpected internal errors in the SSE error event', async () => {
    const { course, student } = await setup();
    setAiProviderForTests(
      fakeProvider({
        streamText: () => ({
          async *[Symbol.asyncIterator]() {
            yield 'Partial ';
            throw new Error('secret internal detail');
          },
        }),
      }),
    );
    const res = await api.post(chatUrl(course.id)).set(authHeader(student)).send({ message: 'hi' });
    const events = parseSse(res.text);
    expect(events[1]).toEqual({
      event: 'error',
      data: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
    expect(res.text).not.toContain('secret internal detail');
  });

  describe('when the client disconnects', () => {
    /** Mở kết nối thật tới app, gửi câu hỏi rồi ngắt: sau đoạn chữ đầu tiên (`afterFirstChunk`) hoặc sau 150 ms. */
    async function askThenDisconnect(
      courseId: string,
      user: { id: string },
      afterFirstChunk: boolean,
      whileConnected: () => Promise<void>,
    ): Promise<void> {
      const server = createApp().listen(0);
      try {
        const { port } = server.address() as AddressInfo;
        await new Promise<void>((resolve, reject) => {
          const req = http.request(
            {
              port,
              method: 'POST',
              path: `${API}/courses/${courseId}/ai/chat`,
              headers: { ...authHeader(user), 'Content-Type': 'application/json' },
            },
            (res) => {
              res.once('data', () => {
                if (afterFirstChunk) {
                  req.destroy();
                  resolve();
                }
              });
              res.on('error', () => undefined);
            },
          );
          req.on('error', (err) => {
            if ((err as NodeJS.ErrnoException).code !== 'ECONNRESET') reject(err);
          });
          req.end(JSON.stringify({ message: 'hi' }));
          if (!afterFirstChunk) {
            setTimeout(() => {
              req.destroy();
              resolve();
            }, 150);
          }
        });
        await new Promise((r) => setTimeout(r, 150)); // để server nhận ra kết nối đã đóng
        await whileConnected();
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    }

    async function waitFor(condition: () => boolean): Promise<void> {
      for (let i = 0; i < 60 && !condition(); i += 1) await new Promise((r) => setTimeout(r, 50));
    }

    it('does not save a half answer when the client leaves mid-stream', async () => {
      const { course, student } = await setup();
      let release: () => void = () => undefined;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      let cleanedUp = false;
      setAiProviderForTests(
        fakeProvider({
          streamText: () => ({
            async *[Symbol.asyncIterator]() {
              try {
                yield 'Hello ';
                await gate;
                yield 'world';
              } finally {
                cleanedUp = true;
              }
            },
          }),
        }),
      );

      try {
        await askThenDisconnect(course.id, student, true, async () => {
          release();
          await waitFor(() => cleanedUp);
        });
      } finally {
        release();
      }

      expect(cleanedUp).toBe(true);
      expect(await countMessages()).toBe(0);
    });

    it('cancels the AI request and saves nothing when the client leaves before the first chunk', async () => {
      const { course, student } = await setup();
      let sawAbort = false;
      setAiProviderForTests(
        fakeProvider({
          streamText: (request: AiTextRequest) => ({
            async *[Symbol.asyncIterator]() {
              await new Promise<void>((resolve) => {
                if (request.signal?.aborted) resolve();
                request.signal?.addEventListener('abort', () => resolve(), { once: true });
              });
              sawAbort = request.signal?.aborted === true;
              throw new AiProviderError('aborted', 'Request aborted');
              yield ''; // làm cho hàm là generator
            },
          }),
        }),
      );

      await askThenDisconnect(course.id, student, false, async () => {
        await waitFor(() => sawAbort);
      });

      expect(sawAbort).toBe(true);
      expect(await countMessages()).toBe(0);
    });

    it('stops quietly when the AI request is aborted after the first chunk', async () => {
      const { course, student } = await setup();
      let sawAbort = false;
      setAiProviderForTests(
        fakeProvider({
          streamText: (request: AiTextRequest) => ({
            async *[Symbol.asyncIterator]() {
              yield 'Hello ';
              await new Promise<void>((resolve) => {
                request.signal?.addEventListener('abort', () => resolve(), { once: true });
              });
              sawAbort = true;
              throw new AiProviderError('aborted', 'Request aborted');
            },
          }),
        }),
      );

      await askThenDisconnect(course.id, student, true, async () => {
        await waitFor(() => sawAbort);
      });

      expect(sawAbort).toBe(true);
      expect(await countMessages()).toBe(0);
    });
  });
});

// ---------------------------------------------------------------- GET / DELETE /courses/:id/ai/chat

describe('GET /courses/:id/ai/chat', () => {
  const url = (courseId: string, query = '') => `${API}/courses/${courseId}/ai/chat${query}`;

  async function talk(courseId: string, user: { id: string }, message: string) {
    await api.post(url(courseId)).set(authHeader(user)).send({ message });
  }

  it('lists the conversation newest first', async () => {
    const { course, student } = await setup();
    await talk(course.id, student, 'first question');
    await talk(course.id, student, 'second question');

    const res = await api.get(url(course.id)).set(authHeader(student));

    expect(res.status).toBe(200);
    expect(res.body.data.map((m: { role: string }) => m.role)).toEqual([
      'ASSISTANT',
      'USER',
      'ASSISTANT',
      'USER',
    ]);
    expect(res.body.data[1]).toEqual({
      id: expect.any(String),
      role: 'USER',
      content: 'second question',
      createdAt: expect.stringMatching(/Z$/),
    });
    expect(res.body.data[3].content).toBe('first question');
    expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 4, totalPages: 1 });
  });

  it('paginates', async () => {
    const { course, student } = await setup();
    await talk(course.id, student, 'q1');
    await talk(course.id, student, 'q2');

    const page1 = await api.get(url(course.id, '?page=1&limit=3')).set(authHeader(student));
    const page2 = await api.get(url(course.id, '?page=2&limit=3')).set(authHeader(student));

    expect(page1.body.data).toHaveLength(3);
    expect(page2.body.data).toHaveLength(1);
    expect(page2.body.data[0].content).toBe('q1');
    expect(page1.body.meta).toEqual({ page: 1, limit: 3, total: 4, totalPages: 2 });
  });

  it('only returns the messages of the requesting user in this course', async () => {
    const { course, student, other } = await setup();
    const otherCourse = await createCourse();
    await createEnrollment(student.id, otherCourse.id);
    await talk(course.id, student, 'mine');
    await talk(course.id, other, 'theirs');
    await talk(otherCourse.id, student, 'another course');

    const res = await api.get(url(course.id)).set(authHeader(student));

    expect(res.body.data.map((m: { content: string }) => m.content)).toContain('mine');
    expect(JSON.stringify(res.body)).not.toContain('theirs');
    expect(JSON.stringify(res.body)).not.toContain('another course');
    expect(res.body.meta.total).toBe(2);
  });

  it('returns an empty list when nothing was asked yet', async () => {
    const { course, student } = await setup();
    const res = await api.get(url(course.id)).set(authHeader(student));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.total).toBe(0);
  });

  it('returns 400 for an invalid pagination query', async () => {
    const { course, student } = await setup();
    const res = await api.get(url(course.id, '?limit=500')).set(authHeader(student));
    expect(res.status).toBe(400);
  });

  it('returns 403 NOT_ENROLLED and 404 COURSE_NOT_FOUND', async () => {
    const { course, outsider } = await setup();
    const forbidden = await api.get(url(course.id)).set(authHeader(outsider));
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe('NOT_ENROLLED');

    const missing = await api.get(url('nope')).set(authHeader(outsider));
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('COURSE_NOT_FOUND');
  });
});

describe('DELETE /courses/:id/ai/chat', () => {
  const url = (courseId: string) => `${API}/courses/${courseId}/ai/chat`;

  it('clears only my conversation in this course (204)', async () => {
    const { course, student, other } = await setup();
    await api.post(url(course.id)).set(authHeader(student)).send({ message: 'mine' });
    await api.post(url(course.id)).set(authHeader(other)).send({ message: 'theirs' });

    const res = await api.delete(url(course.id)).set(authHeader(student));

    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    const mine = await api.get(url(course.id)).set(authHeader(student));
    const theirs = await api.get(url(course.id)).set(authHeader(other));
    expect(mine.body.data).toEqual([]);
    expect(theirs.body.data).toHaveLength(2);
  });

  it('is idempotent', async () => {
    const { course, student } = await setup();
    expect((await api.delete(url(course.id)).set(authHeader(student))).status).toBe(204);
    expect((await api.delete(url(course.id)).set(authHeader(student))).status).toBe(204);
  });

  it('returns 403 NOT_ENROLLED and 404 COURSE_NOT_FOUND', async () => {
    const { course, outsider } = await setup();
    const forbidden = await api.delete(url(course.id)).set(authHeader(outsider));
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe('NOT_ENROLLED');

    const missing = await api.delete(url('nope')).set(authHeader(outsider));
    expect(missing.status).toBe(404);
  });
});

// ---------------------------------------------------------------- Dữ liệu seed

describe('cascade', () => {
  it('removes the chat history when the user is deleted', async () => {
    const { course, student } = await setup();
    await api
      .post(`${API}/courses/${course.id}/ai/chat`)
      .set(authHeader(student))
      .send({ message: 'hi' });
    expect(await countMessages()).toBe(2);

    await prisma.user.delete({ where: { id: student.id } });

    expect(await countMessages()).toBe(0);
  });

  it('removes the chat history when the course is deleted', async () => {
    const { course, student } = await setup();
    await api
      .post(`${API}/courses/${course.id}/ai/chat`)
      .set(authHeader(student))
      .send({ message: 'hi' });

    await prisma.course.delete({ where: { id: course.id } });

    expect(await countMessages()).toBe(0);
  });
});
