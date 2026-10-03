import { prisma } from '@/lib/prisma';

import * as questionService from './question.service';

jest.mock('@/lib/prisma', () => {
  const model = () => ({
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    deleteMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  });
  const db: Record<string, unknown> = {
    course: model(),
    enrollment: model(),
    question: model(),
    answer: model(),
    questionLike: model(),
    notification: model(),
  };
  db.$transaction = jest.fn();
  return { prisma: db };
});

type MockModel = Record<string, jest.Mock>;
const db = prisma as unknown as Record<
  'course' | 'enrollment' | 'question' | 'answer' | 'questionLike' | 'notification',
  MockModel
> & { $transaction: jest.Mock };

beforeEach(() => {
  for (const model of [
    db.course,
    db.enrollment,
    db.question,
    db.answer,
    db.questionLike,
    db.notification,
  ]) {
    for (const fn of Object.values(model)) fn.mockReset();
  }
  db.$transaction.mockReset();
  db.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(db));
});

const enrolled = { id: 'enr-1', progressPercent: 0, lastLessonId: null };

describe('questionService.createAnswer (BR-09)', () => {
  const question = {
    id: 'q-1',
    userId: 'asker',
    courseId: 'course-1',
    course: { title: 'UX Foundation' },
  };
  const answerRow = {
    id: 'a-1',
    content: 'Use a modular scale.',
    createdAt: new Date('2026-10-01T00:00:00Z'),
    user: { id: 'helper', fullName: 'Helper Two', avatarUrl: null },
  };

  function arrange() {
    db.question.findUnique.mockResolvedValue(question);
    db.enrollment.findUnique.mockResolvedValue(enrolled);
    db.answer.create.mockResolvedValue(answerRow);
    db.question.update.mockResolvedValue({ id: 'q-1' });
    db.notification.create.mockResolvedValue({ id: 'n-1' });
  }

  it('creates the answer, increments answerCount and notifies the asker', async () => {
    arrange();

    const result = await questionService.createAnswer('helper', 'q-1', 'Use a modular scale.');

    expect(result).toEqual({
      id: 'a-1',
      content: 'Use a modular scale.',
      createdAt: '2026-10-01T00:00:00.000Z',
      user: { id: 'helper', fullName: 'Helper Two', avatarUrl: null },
    });
    expect(db.question.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { answerCount: { increment: 1 } } }),
    );
    expect(db.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'asker',
          type: 'NEW_ANSWER',
          data: { courseId: 'course-1', questionId: 'q-1' },
        }),
      }),
    );
  });

  it('does not notify when the asker answers their own question', async () => {
    arrange();
    await questionService.createAnswer('asker', 'q-1', 'Answering myself.');
    expect(db.notification.create).not.toHaveBeenCalled();
    expect(db.question.update).toHaveBeenCalledTimes(1);
  });

  it('throws 403 NOT_ENROLLED and writes nothing for a non-enrolled user', async () => {
    arrange();
    db.enrollment.findUnique.mockResolvedValue(null);

    await expect(questionService.createAnswer('outsider', 'q-1', 'Hello')).rejects.toMatchObject({
      status: 403,
      code: 'NOT_ENROLLED',
    });
    expect(db.answer.create).not.toHaveBeenCalled();
    expect(db.notification.create).not.toHaveBeenCalled();
  });

  it('throws 404 QUESTION_NOT_FOUND for an unknown question', async () => {
    db.question.findUnique.mockResolvedValue(null);
    await expect(questionService.createAnswer('helper', 'nope', 'Hello')).rejects.toMatchObject({
      status: 404,
      code: 'QUESTION_NOT_FOUND',
    });
  });
});

describe('questionService like / unlike', () => {
  beforeEach(() => {
    db.question.findUnique.mockResolvedValue({ courseId: 'course-1' });
    db.enrollment.findUnique.mockResolvedValue(enrolled);
  });

  it('increments likeCount only when a new like row was created', async () => {
    db.questionLike.createMany.mockResolvedValue({ count: 1 });
    db.question.update.mockResolvedValue({ likeCount: 4 });

    const result = await questionService.likeQuestion('user-1', 'q-1');

    expect(result).toEqual({ likeCount: 4, isLiked: true });
    expect(db.questionLike.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    );
  });

  it('does not change likeCount when the like already existed', async () => {
    db.questionLike.createMany.mockResolvedValue({ count: 0 });
    db.question.findUniqueOrThrow.mockResolvedValue({ likeCount: 4 });

    const result = await questionService.likeQuestion('user-1', 'q-1');

    expect(result).toEqual({ likeCount: 4, isLiked: true });
    expect(db.question.update).not.toHaveBeenCalled();
  });

  it('decrements likeCount only when a like row was deleted', async () => {
    db.questionLike.deleteMany.mockResolvedValue({ count: 1 });
    db.question.update.mockResolvedValue({ likeCount: 2 });

    const result = await questionService.unlikeQuestion('user-1', 'q-1');

    expect(result).toEqual({ likeCount: 2, isLiked: false });
    expect(db.question.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { likeCount: { decrement: 1 } } }),
    );
  });

  it('does not change likeCount when there was no like to remove', async () => {
    db.questionLike.deleteMany.mockResolvedValue({ count: 0 });
    db.question.findUniqueOrThrow.mockResolvedValue({ likeCount: 2 });

    const result = await questionService.unlikeQuestion('user-1', 'q-1');

    expect(result).toEqual({ likeCount: 2, isLiked: false });
    expect(db.question.update).not.toHaveBeenCalled();
  });
});

describe('questionService.listQuestions', () => {
  it('throws 404 COURSE_NOT_FOUND for an unknown course and 403 when not enrolled', async () => {
    db.course.findUnique.mockResolvedValueOnce(null);
    await expect(questionService.listQuestions('u', 'nope', {})).rejects.toMatchObject({
      status: 404,
      code: 'COURSE_NOT_FOUND',
    });

    db.course.findUnique.mockResolvedValueOnce({ id: 'course-1', enrollments: [] });
    await expect(questionService.listQuestions('u', 'course-1', {})).rejects.toMatchObject({
      status: 403,
      code: 'NOT_ENROLLED',
    });
    expect(db.question.findMany).not.toHaveBeenCalled();
  });

  it('derives isLiked from the viewer-specific likes relation', async () => {
    db.course.findUnique.mockResolvedValue({ id: 'course-1', enrollments: [enrolled] });
    const base = {
      content: 'Q',
      createdAt: new Date('2026-10-01T00:00:00Z'),
      likeCount: 1,
      answerCount: 0,
      user: { id: 'u2', fullName: 'Someone', avatarUrl: null },
    };
    db.question.findMany.mockResolvedValue([
      { ...base, id: 'q-liked', likes: [{ userId: 'u' }] },
      { ...base, id: 'q-plain', likes: [] },
    ]);
    db.question.count.mockResolvedValue(2);

    const { items, meta } = await questionService.listQuestions('u', 'course-1', {});

    expect(items.map((q) => [q.id, q.isLiked])).toEqual([
      ['q-liked', true],
      ['q-plain', false],
    ]);
    expect(meta).toEqual({ page: 1, limit: 20, total: 2, totalPages: 1 });
  });
});

describe('questionService.createQuestion / getQuestion', () => {
  const row = {
    id: 'q-1',
    content: 'How do I pick a grid?',
    createdAt: new Date('2026-10-01T00:00:00Z'),
    likeCount: 0,
    answerCount: 0,
    user: { id: 'u', fullName: 'Asker', avatarUrl: null },
    likes: [],
  };

  it('createQuestion stores the question for an enrolled user and maps it', async () => {
    db.course.findUnique.mockResolvedValue({ id: 'course-1', enrollments: [enrolled] });
    db.question.create.mockResolvedValue(row);

    const result = await questionService.createQuestion('u', 'course-1', row.content);

    expect(result).toMatchObject({
      id: 'q-1',
      isLiked: false,
      createdAt: '2026-10-01T00:00:00.000Z',
    });
    expect(db.question.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { courseId: 'course-1', userId: 'u', content: row.content },
      }),
    );
  });

  it('createQuestion throws 403 NOT_ENROLLED and writes nothing for outsiders', async () => {
    db.course.findUnique.mockResolvedValue({ id: 'course-1', enrollments: [] });
    await expect(questionService.createQuestion('u', 'course-1', 'Hi')).rejects.toMatchObject({
      status: 403,
      code: 'NOT_ENROLLED',
    });
    expect(db.question.create).not.toHaveBeenCalled();
  });

  it('getQuestion returns the question with isLiked for an enrolled user', async () => {
    db.question.findUnique.mockResolvedValue({
      ...row,
      courseId: 'course-1',
      likes: [{ userId: 'u' }],
    });
    db.enrollment.findUnique.mockResolvedValue(enrolled);

    await expect(questionService.getQuestion('u', 'q-1')).resolves.toMatchObject({
      id: 'q-1',
      isLiked: true,
    });
  });

  it('getQuestion throws 404 when missing and 403 when not enrolled', async () => {
    db.question.findUnique.mockResolvedValueOnce(null);
    await expect(questionService.getQuestion('u', 'nope')).rejects.toMatchObject({
      status: 404,
      code: 'QUESTION_NOT_FOUND',
    });

    db.question.findUnique.mockResolvedValueOnce({ ...row, courseId: 'course-1' });
    db.enrollment.findUnique.mockResolvedValue(null);
    await expect(questionService.getQuestion('u', 'q-1')).rejects.toMatchObject({
      status: 403,
      code: 'NOT_ENROLLED',
    });
  });
});

describe('questionService.listAnswers', () => {
  it('lists answers oldest first with pagination meta for an enrolled user', async () => {
    db.question.findUnique.mockResolvedValue({ courseId: 'course-1' });
    db.enrollment.findUnique.mockResolvedValue(enrolled);
    db.answer.findMany.mockResolvedValue([
      {
        id: 'a-1',
        content: 'Use 12 columns.',
        createdAt: new Date('2026-10-02T00:00:00Z'),
        user: { id: 'h', fullName: 'Helper', avatarUrl: null },
      },
    ]);
    db.answer.count.mockResolvedValue(21);

    const { items, meta } = await questionService.listAnswers('u', 'q-1', { page: 2, limit: 20 });

    expect(items.map((a) => a.id)).toEqual(['a-1']);
    expect(meta).toEqual({ page: 2, limit: 20, total: 21, totalPages: 2 });
    expect(db.answer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 20,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),
    );
  });

  it('throws 404 for an unknown question and 403 for a non-enrolled user', async () => {
    db.question.findUnique.mockResolvedValueOnce(null);
    await expect(questionService.listAnswers('u', 'nope', {})).rejects.toMatchObject({
      status: 404,
    });

    db.question.findUnique.mockResolvedValueOnce({ courseId: 'course-1' });
    db.enrollment.findUnique.mockResolvedValue(null);
    await expect(questionService.listAnswers('u', 'q-1', {})).rejects.toMatchObject({
      status: 403,
      code: 'NOT_ENROLLED',
    });
    expect(db.answer.findMany).not.toHaveBeenCalled();
  });
});

describe('questionService like / unlike error paths', () => {
  it('throws 404 QUESTION_NOT_FOUND for an unknown question', async () => {
    db.question.findUnique.mockResolvedValue(null);
    await expect(questionService.likeQuestion('u', 'nope')).rejects.toMatchObject({ status: 404 });
    await expect(questionService.unlikeQuestion('u', 'nope')).rejects.toMatchObject({
      status: 404,
    });
  });

  it('throws 403 NOT_ENROLLED and does not touch likes for outsiders', async () => {
    db.question.findUnique.mockResolvedValue({ courseId: 'course-1' });
    db.enrollment.findUnique.mockResolvedValue(null);
    await expect(questionService.likeQuestion('u', 'q-1')).rejects.toMatchObject({ status: 403 });
    await expect(questionService.unlikeQuestion('u', 'q-1')).rejects.toMatchObject({
      status: 403,
    });
    expect(db.questionLike.createMany).not.toHaveBeenCalled();
    expect(db.questionLike.deleteMany).not.toHaveBeenCalled();
  });
});
