import { prisma } from '@/lib/prisma';

import { authHeader } from '../helpers/authHelper';
import {
  createAnswer,
  createCourse,
  createEnrollment,
  createQuestion,
  createUser,
} from '../helpers/factories';
import { resetDb } from '../helpers/resetDb';
import { API, createTestApi } from '../helpers/testApp';

const api = createTestApi();

beforeEach(async () => {
  await resetDb();
});

/** Khóa học + một học viên đã ghi danh (+ tùy chọn thêm học viên khác). */
async function setup() {
  const course = await createCourse({ title: 'UX Foundation' });
  const asker = await createUser({ fullName: 'Asker One' });
  const helper = await createUser({ fullName: 'Helper Two' });
  const outsider = await createUser({ fullName: 'Outsider' });
  await createEnrollment(asker.id, course.id);
  await createEnrollment(helper.id, course.id);
  return { course, asker, helper, outsider };
}

describe('GET /courses/:id/questions', () => {
  it('lists questions newest first with the viewer-specific isLiked', async () => {
    const { course, asker, helper } = await setup();
    const older = await createQuestion(asker.id, course.id, {
      content: 'An older question about colors?',
      createdAt: new Date('2026-09-01T00:00:00Z'),
    });
    const newer = await createQuestion(helper.id, course.id, {
      content: 'A newer question about grids?',
      createdAt: new Date('2026-09-02T00:00:00Z'),
    });
    await api.put(`${API}/questions/${older.id}/like`).set(authHeader(asker));

    const res = await api.get(`${API}/courses/${course.id}/questions`).set(authHeader(asker));

    expect(res.status).toBe(200);
    expect(res.body.data.map((q: { id: string }) => q.id)).toEqual([newer.id, older.id]);
    expect(res.body.data[1]).toEqual({
      id: older.id,
      content: 'An older question about colors?',
      createdAt: '2026-09-01T00:00:00.000Z',
      likeCount: 1,
      answerCount: 0,
      isLiked: true,
      user: { id: asker.id, fullName: 'Asker One', avatarUrl: null },
    });
    expect(res.body.data[0].isLiked).toBe(false);
    expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 2, totalPages: 1 });

    const asHelper = await api.get(`${API}/courses/${course.id}/questions`).set(authHeader(helper));
    expect(asHelper.body.data[1].isLiked).toBe(false);
    expect(asHelper.body.data[1].likeCount).toBe(1);
  });

  it('only returns the questions of the requested course and paginates', async () => {
    const { course, asker } = await setup();
    const other = await createCourse();
    await createEnrollment(asker.id, other.id);
    for (let i = 0; i < 3; i += 1) await createQuestion(asker.id, course.id);
    await createQuestion(asker.id, other.id);

    const res = await api
      .get(`${API}/courses/${course.id}/questions?page=2&limit=2`)
      .set(authHeader(asker));

    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
  });

  it('returns 403 NOT_ENROLLED for a user who has not enrolled', async () => {
    const { course, outsider } = await setup();
    const res = await api.get(`${API}/courses/${course.id}/questions`).set(authHeader(outsider));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_ENROLLED');
  });

  it('returns 404 for an unknown course and 401 without a token', async () => {
    const { outsider, course } = await setup();
    const notFound = await api.get(`${API}/courses/nope/questions`).set(authHeader(outsider));
    const anonymous = await api.get(`${API}/courses/${course.id}/questions`);
    expect(notFound.status).toBe(404);
    expect(notFound.body.error.code).toBe('COURSE_NOT_FOUND');
    expect(anonymous.status).toBe(401);
  });
});

describe('POST /courses/:id/questions', () => {
  it('creates a question and returns 201 with the QuestionDto', async () => {
    const { course, asker } = await setup();

    const res = await api
      .post(`${API}/courses/${course.id}/questions`)
      .set(authHeader(asker))
      .send({ content: '  How do I pick a type scale?  ' });

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({
      id: expect.any(String),
      content: 'How do I pick a type scale?',
      createdAt: expect.any(String),
      likeCount: 0,
      answerCount: 0,
      isLiked: false,
      user: { id: asker.id, fullName: 'Asker One', avatarUrl: null },
    });
    expect(await prisma.question.count({ where: { courseId: course.id } })).toBe(1);
  });

  it('returns 403 NOT_ENROLLED and creates nothing for a non-enrolled user', async () => {
    const { course, outsider } = await setup();
    const res = await api
      .post(`${API}/courses/${course.id}/questions`)
      .set(authHeader(outsider))
      .send({ content: 'Can I ask without enrolling?' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_ENROLLED');
    expect(await prisma.question.count()).toBe(0);
  });

  it.each([
    ['empty content', { content: '' }],
    ['whitespace-only content', { content: '    ' }],
    ['content longer than 1000 characters', { content: 'q'.repeat(1001) }],
    ['missing content', {}],
    ['non-string content', { content: 42 }],
  ])('returns 400 VALIDATION_ERROR for %s', async (_label, body) => {
    const { course, asker } = await setup();
    const res = await api
      .post(`${API}/courses/${course.id}/questions`)
      .set(authHeader(asker))
      .send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('accepts exactly 1000 characters', async () => {
    const { course, asker } = await setup();
    const res = await api
      .post(`${API}/courses/${course.id}/questions`)
      .set(authHeader(asker))
      .send({ content: 'q'.repeat(1000) });
    expect(res.status).toBe(201);
  });
});

describe('GET /questions/:id', () => {
  it('returns the question to an enrolled user', async () => {
    const { course, asker, helper } = await setup();
    const question = await createQuestion(asker.id, course.id);

    const res = await api.get(`${API}/questions/${question.id}`).set(authHeader(helper));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(
      expect.objectContaining({ id: question.id, isLiked: false, likeCount: 0 }),
    );
  });

  it('returns 403 NOT_ENROLLED for a user who has not enrolled in the question course', async () => {
    const { course, asker, outsider } = await setup();
    const question = await createQuestion(asker.id, course.id);

    const res = await api.get(`${API}/questions/${question.id}`).set(authHeader(outsider));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_ENROLLED');
    expect(JSON.stringify(res.body)).not.toContain(question.content);
  });

  it('returns 404 QUESTION_NOT_FOUND for an unknown question', async () => {
    const { asker } = await setup();
    const res = await api.get(`${API}/questions/nope`).set(authHeader(asker));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('QUESTION_NOT_FOUND');
  });
});

describe('GET /questions/:id/answers', () => {
  it('lists answers oldest first with the author and pagination meta', async () => {
    const { course, asker, helper } = await setup();
    const question = await createQuestion(asker.id, course.id);
    await createAnswer(asker.id, question.id, {
      content: 'Second answer, from the asker.',
      createdAt: new Date('2026-09-02T00:00:00Z'),
    });
    await createAnswer(helper.id, question.id, {
      content: 'First answer, from the helper.',
      createdAt: new Date('2026-09-01T00:00:00Z'),
    });

    const res = await api.get(`${API}/questions/${question.id}/answers`).set(authHeader(asker));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
      {
        id: expect.any(String),
        content: 'First answer, from the helper.',
        createdAt: '2026-09-01T00:00:00.000Z',
        user: { id: helper.id, fullName: 'Helper Two', avatarUrl: null },
      },
      expect.objectContaining({ content: 'Second answer, from the asker.' }),
    ]);
    expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 2, totalPages: 1 });
  });

  it('returns 403 for a non-enrolled user and 404 for an unknown question', async () => {
    const { course, asker, outsider } = await setup();
    const question = await createQuestion(asker.id, course.id);

    const forbidden = await api
      .get(`${API}/questions/${question.id}/answers`)
      .set(authHeader(outsider));
    const notFound = await api.get(`${API}/questions/nope/answers`).set(authHeader(asker));

    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe('NOT_ENROLLED');
    expect(notFound.status).toBe(404);
    expect(notFound.body.error.code).toBe('QUESTION_NOT_FOUND');
  });
});

describe('POST /questions/:id/answers', () => {
  it('creates the answer, bumps answerCount and notifies the asker (BR-09)', async () => {
    const { course, asker, helper } = await setup();
    const question = await createQuestion(asker.id, course.id);

    const res = await api
      .post(`${API}/questions/${question.id}/answers`)
      .set(authHeader(helper))
      .send({ content: 'Start with a base size of 16 and scale by 1.25.' });

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({
      id: expect.any(String),
      content: 'Start with a base size of 16 and scale by 1.25.',
      createdAt: expect.any(String),
      user: { id: helper.id, fullName: 'Helper Two', avatarUrl: null },
    });
    const stored = await prisma.question.findUniqueOrThrow({ where: { id: question.id } });
    expect(stored.answerCount).toBe(1);

    const notifications = await prisma.notification.findMany();
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toEqual(
      expect.objectContaining({
        userId: asker.id,
        type: 'NEW_ANSWER',
        isRead: false,
        data: { courseId: course.id, questionId: question.id },
      }),
    );
    expect(notifications[0]!.body).toContain('Helper Two');
    expect(notifications[0]!.body).toContain('UX Foundation');
  });

  it('does not notify when the asker answers their own question', async () => {
    const { course, asker } = await setup();
    const question = await createQuestion(asker.id, course.id);

    const res = await api
      .post(`${API}/questions/${question.id}/answers`)
      .set(authHeader(asker))
      .send({ content: 'I found the answer myself, thanks.' });

    expect(res.status).toBe(201);
    expect(await prisma.notification.count()).toBe(0);
    const stored = await prisma.question.findUniqueOrThrow({ where: { id: question.id } });
    expect(stored.answerCount).toBe(1);
  });

  it('counts every answer', async () => {
    const { course, asker, helper } = await setup();
    const question = await createQuestion(asker.id, course.id);
    const post = (user: { id: string }, content: string) =>
      api.post(`${API}/questions/${question.id}/answers`).set(authHeader(user)).send({ content });

    await post(helper, 'First answer');
    await post(asker, 'Second answer');
    await post(helper, 'Third answer');

    const stored = await prisma.question.findUniqueOrThrow({ where: { id: question.id } });
    expect(stored.answerCount).toBe(3);
    expect(await prisma.notification.count()).toBe(2); // chỉ các câu trả lời của người khác
  });

  it('returns 403 NOT_ENROLLED and writes nothing for a non-enrolled user', async () => {
    const { course, asker, outsider } = await setup();
    const question = await createQuestion(asker.id, course.id);

    const res = await api
      .post(`${API}/questions/${question.id}/answers`)
      .set(authHeader(outsider))
      .send({ content: 'Let me answer without enrolling.' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_ENROLLED');
    expect(await prisma.answer.count()).toBe(0);
    expect(await prisma.notification.count()).toBe(0);
  });

  it('returns 404 QUESTION_NOT_FOUND for an unknown question', async () => {
    const { helper } = await setup();
    const res = await api
      .post(`${API}/questions/nope/answers`)
      .set(authHeader(helper))
      .send({ content: 'Anyone there?' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('QUESTION_NOT_FOUND');
  });

  it.each([
    ['empty content', { content: '' }],
    ['content longer than 1000 characters', { content: 'a'.repeat(1001) }],
    ['missing content', {}],
  ])('returns 400 VALIDATION_ERROR for %s', async (_label, body) => {
    const { course, asker, helper } = await setup();
    const question = await createQuestion(asker.id, course.id);
    const res = await api
      .post(`${API}/questions/${question.id}/answers`)
      .set(authHeader(helper))
      .send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('PUT/DELETE /questions/:id/like', () => {
  it('likes idempotently and reflects isLiked in the list', async () => {
    const { course, asker, helper } = await setup();
    const question = await createQuestion(asker.id, course.id);

    const first = await api.put(`${API}/questions/${question.id}/like`).set(authHeader(helper));
    const second = await api.put(`${API}/questions/${question.id}/like`).set(authHeader(helper));
    const byAsker = await api.put(`${API}/questions/${question.id}/like`).set(authHeader(asker));

    expect(first.status).toBe(200);
    expect(first.body.data).toEqual({ likeCount: 1, isLiked: true });
    expect(second.body.data).toEqual({ likeCount: 1, isLiked: true });
    expect(byAsker.body.data).toEqual({ likeCount: 2, isLiked: true });

    const list = await api.get(`${API}/courses/${course.id}/questions`).set(authHeader(helper));
    expect(list.body.data[0]).toEqual(expect.objectContaining({ likeCount: 2, isLiked: true }));
  });

  it('unlikes idempotently without dropping below the real count', async () => {
    const { course, asker, helper } = await setup();
    const question = await createQuestion(asker.id, course.id);
    await api.put(`${API}/questions/${question.id}/like`).set(authHeader(asker));
    await api.put(`${API}/questions/${question.id}/like`).set(authHeader(helper));

    const first = await api.delete(`${API}/questions/${question.id}/like`).set(authHeader(helper));
    const second = await api.delete(`${API}/questions/${question.id}/like`).set(authHeader(helper));

    expect(first.status).toBe(200);
    expect(first.body.data).toEqual({ likeCount: 1, isLiked: false });
    expect(second.body.data).toEqual({ likeCount: 1, isLiked: false });
  });

  it('returns 403 NOT_ENROLLED for a non-enrolled user and 404 for an unknown question', async () => {
    const { course, asker, outsider } = await setup();
    const question = await createQuestion(asker.id, course.id);

    const forbidden = await api
      .put(`${API}/questions/${question.id}/like`)
      .set(authHeader(outsider));
    const notFound = await api.put(`${API}/questions/nope/like`).set(authHeader(asker));
    const notFoundDelete = await api.delete(`${API}/questions/nope/like`).set(authHeader(asker));

    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe('NOT_ENROLLED');
    expect(notFound.status).toBe(404);
    expect(notFoundDelete.status).toBe(404);
    expect(await prisma.questionLike.count()).toBe(0);
  });

  it('returns 401 without a token', async () => {
    const res = await api.put(`${API}/questions/whatever/like`);
    expect(res.status).toBe(401);
  });
});
