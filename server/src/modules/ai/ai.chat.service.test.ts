import { aiGlobalQuota, aiQuota, aiUserDailyQuota, setAiProviderForTests } from '@/lib/ai';
import { AiProviderError } from '@/lib/ai/errors';
import { MockProvider } from '@/lib/ai/mock.provider';
import type { AiProvider, AiTextRequest } from '@/lib/ai/types';
import { prisma } from '@/lib/prisma';

import * as chatService from './ai.chat.service';
import { MOCK_CHAT_PREFIX } from './ai.mock';

jest.mock('@/lib/prisma', () => {
  const model = () => ({
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  });
  return {
    prisma: {
      course: model(),
      aiChatMessage: model(),
      $transaction: jest.fn(),
    },
  };
});

type MockModel = Record<string, jest.Mock>;
const db = prisma as unknown as Record<'course' | 'aiChatMessage', MockModel> & {
  $transaction: jest.Mock;
};

const NOTES = [
  'Wireframes show the structure of a screen before any visual design is added.',
  'Start with the user goal and the main task the screen must support.',
].join('\n');

const courseRow = {
  id: 'course-1',
  title: 'UX Foundations',
  subtitle: null,
  description: 'A practical introduction.',
  benefits: [],
  category: { name: 'Design' },
  teacher: { user: { fullName: 'Ada Lovelace' } },
  sections: [
    {
      title: 'Wireframes',
      lessons: [{ id: 'l1', title: 'Wireframing key flows', durationSec: 60, content: NOTES }],
    },
  ],
};

const enrolledCourse = {
  id: 'course-1',
  enrollments: [{ id: 'e1', progressPercent: 0, lastLessonId: null }],
};

// ---------------------------------------------------------------- Provider giả

const mockProvider = new MockProvider();
const streamText = jest.fn<AsyncIterable<string>, [AiTextRequest]>((request) =>
  mockProvider.streamText(request),
);
const provider = { name: 'mock', model: 'mock-ai-1', streamText } as unknown as AiProvider;

/** Stream chỉ gồm các đoạn cho sẵn, rồi (tùy chọn) ném lỗi. */
function fixedStream(chunks: string[], error?: Error): () => AsyncGenerator<string> {
  return async function* () {
    for (const chunk of chunks) yield chunk;
    if (error) throw error;
  };
}

function useStream(factory: () => AsyncIterable<string>): void {
  streamText.mockImplementation(() => factory());
}

function resetQuotas(enabled: boolean, limits = { chat: 100, general: 100 }): void {
  for (const quota of [aiQuota, aiUserDailyQuota, aiGlobalQuota]) {
    quota.reset();
    quota.configure({ enabled, limits });
  }
}

async function collect(stream: AsyncIterable<string>): Promise<string> {
  let text = '';
  for await (const chunk of stream) text += chunk;
  return text;
}

beforeEach(() => {
  for (const model of [db.course, db.aiChatMessage]) {
    for (const fn of Object.values(model)) fn.mockReset();
  }
  db.$transaction.mockReset().mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops));
  streamText
    .mockReset()
    .mockImplementation((request: AiTextRequest) => mockProvider.streamText(request));
  db.course.findUnique.mockResolvedValue(enrolledCourse);
  db.course.findFirst.mockResolvedValue(courseRow);
  db.aiChatMessage.findMany.mockResolvedValue([]);
  setAiProviderForTests(provider);
  resetQuotas(false);
});

afterEach(() => {
  jest.restoreAllMocks();
});

afterAll(() => {
  setAiProviderForTests(undefined);
});

// ---------------------------------------------------------------- startTutorChat

describe('startTutorChat', () => {
  it('streams the answer and builds the prompt from the course materials', async () => {
    const session = await chatService.startTutorChat(
      'u1',
      'course-1',
      'How do I start wireframing?',
      'en',
    );

    const answer = await collect(session.chunks);

    expect(answer.startsWith(MOCK_CHAT_PREFIX)).toBe(true);
    expect(answer).toContain('Wireframing key flows');
    const request = streamText.mock.calls[0]?.[0] as AiTextRequest;
    expect(request).toMatchObject({ label: 'tutor_chat', prompt: 'How do I start wireframing?' });
    expect(request.system).toContain('UX Foundations');
    expect(request.system).toContain('### Lesson 1: Wireframing key flows');
    expect(request.history).toEqual([]);
  });

  it('passes the 10 most recent messages as history, oldest first', async () => {
    db.aiChatMessage.findMany.mockResolvedValue([
      { role: 'ASSISTANT', content: 'second answer' },
      { role: 'USER', content: 'second question' },
      { role: 'ASSISTANT', content: 'first answer' },
      { role: 'USER', content: 'first question' },
    ]);

    const session = await chatService.startTutorChat('u1', 'course-1', 'third question', 'en');
    await collect(session.chunks);

    const request = streamText.mock.calls[0]?.[0] as AiTextRequest;
    expect(request.history).toEqual([
      { role: 'user', text: 'first question' },
      { role: 'assistant', text: 'first answer' },
      { role: 'user', text: 'second question' },
      { role: 'assistant', text: 'second answer' },
    ]);
    expect(db.aiChatMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u1', courseId: 'course-1' },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: chatService.CHAT_HISTORY_CONTEXT,
      }),
    );
  });

  it('forwards the abort signal and the language to the provider', async () => {
    const controller = new AbortController();
    const session = await chatService.startTutorChat(
      'u1',
      'course-1',
      'wireframing?',
      'vi',
      controller.signal,
    );
    await collect(session.chunks);

    const request = streamText.mock.calls[0]?.[0] as AiTextRequest;
    expect(request.signal).toBe(controller.signal);
    expect(request.system).toContain('Vietnamese');
  });

  it('saves the question and the full answer only when complete() is called', async () => {
    const created = { id: 'm-user' };
    db.aiChatMessage.create
      .mockResolvedValueOnce(created)
      .mockResolvedValueOnce({ id: 'm-assistant' });
    useStream(fixedStream(['Hello ', 'world', '!']));

    const session = await chatService.startTutorChat('u1', 'course-1', 'Hi there', 'en');
    expect(db.aiChatMessage.create).not.toHaveBeenCalled();

    expect(await collect(session.chunks)).toBe('Hello world!');
    expect(db.aiChatMessage.create).not.toHaveBeenCalled();

    await expect(session.complete()).resolves.toEqual({ messageId: 'm-assistant' });

    const [userCall, assistantCall] = db.aiChatMessage.create.mock.calls.map(
      (call) => (call[0] as { data: Record<string, unknown> }).data,
    );
    expect(userCall).toMatchObject({
      userId: 'u1',
      courseId: 'course-1',
      role: 'USER',
      content: 'Hi there',
    });
    expect(assistantCall).toMatchObject({
      userId: 'u1',
      courseId: 'course-1',
      role: 'ASSISTANT',
      content: 'Hello world!',
    });
    expect((assistantCall?.createdAt as Date).getTime()).toBeGreaterThan(
      (userCall?.createdAt as Date).getTime(),
    );
    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });

  it('always timestamps the answer after the question even if the clock did not move', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(0);
    db.aiChatMessage.create.mockResolvedValue({ id: 'm' });
    useStream(fixedStream(['ok']));

    const session = await chatService.startTutorChat('u1', 'course-1', 'q', 'en');
    await collect(session.chunks);
    await session.complete();

    const [userCall, assistantCall] = db.aiChatMessage.create.mock.calls.map(
      (call) => (call[0] as { data: { createdAt: Date } }).data,
    );
    expect((assistantCall?.createdAt.getTime() ?? 0) - (userCall?.createdAt.getTime() ?? 0)).toBe(
      1,
    );
  });

  it('throws 404 COURSE_NOT_FOUND for an unknown course', async () => {
    db.course.findUnique.mockResolvedValue(null);
    await expect(chatService.startTutorChat('u1', 'nope', 'hi', 'en')).rejects.toMatchObject({
      status: 404,
      code: 'COURSE_NOT_FOUND',
    });
    expect(streamText).not.toHaveBeenCalled();
  });

  it('throws 403 NOT_ENROLLED when the user has not enrolled', async () => {
    db.course.findUnique.mockResolvedValue({ id: 'course-1', enrollments: [] });
    await expect(chatService.startTutorChat('u1', 'course-1', 'hi', 'en')).rejects.toMatchObject({
      status: 403,
      code: 'NOT_ENROLLED',
    });
    expect(streamText).not.toHaveBeenCalled();
  });

  it('throws 404 when the enrolled course is no longer published', async () => {
    db.course.findFirst.mockResolvedValue(null);
    await expect(chatService.startTutorChat('u1', 'course-1', 'hi', 'en')).rejects.toMatchObject({
      status: 404,
      code: 'COURSE_NOT_FOUND',
    });
  });

  it('throws 503 AI_UNAVAILABLE when the model returns nothing, and gives the request back', async () => {
    resetQuotas(true, { chat: 1, general: 1 });
    useStream(fixedStream([]));
    await expect(chatService.startTutorChat('u1', 'course-1', 'hi', 'en')).rejects.toMatchObject({
      status: 503,
      code: 'AI_UNAVAILABLE',
    });

    useStream(fixedStream(['fine']));
    await expect(
      chatService.startTutorChat('u1', 'course-1', 'hi again', 'en'),
    ).resolves.toBeDefined();
  });

  it.each([
    ['rate_limited', 429, 'AI_RATE_LIMITED'],
    ['blocked', 422, 'AI_BLOCKED'],
    ['timeout', 503, 'AI_UNAVAILABLE'],
  ] as const)('maps an AI %s error before the first chunk to %i %s', async (kind, status, code) => {
    useStream(fixedStream([], new AiProviderError(kind, 'internal')));
    await expect(chatService.startTutorChat('u1', 'course-1', 'hi', 'en')).rejects.toMatchObject({
      status,
      code,
    });
    expect(db.aiChatMessage.create).not.toHaveBeenCalled();
  });

  it('uses the chat quota bucket and rejects with 429 when it is used up', async () => {
    resetQuotas(true, { chat: 1, general: 5 });

    const first = await chatService.startTutorChat('u1', 'course-1', 'wireframing', 'en');
    await collect(first.chunks);

    await expect(
      chatService.startTutorChat('u1', 'course-1', 'wireframing again', 'en'),
    ).rejects.toMatchObject({ status: 429, code: 'AI_RATE_LIMITED' });
    expect(streamText).toHaveBeenCalledTimes(1);
  });

  it('surfaces an error that happens after the first chunk while iterating', async () => {
    useStream(fixedStream(['partial '], new AiProviderError('timeout', 'slow')));
    const session = await chatService.startTutorChat('u1', 'course-1', 'hi', 'en');

    const received: string[] = [];
    await expect(
      (async () => {
        for await (const chunk of session.chunks) received.push(chunk);
      })(),
    ).rejects.toMatchObject({ kind: 'timeout' });

    expect(received).toEqual(['partial ']);
    expect(db.aiChatMessage.create).not.toHaveBeenCalled();
  });

  it('closes the provider stream when the consumer stops early', async () => {
    const returned = jest.fn();
    useStream(() => ({
      [Symbol.asyncIterator]() {
        let index = 0;
        return {
          next: async () => ({ done: false, value: `chunk${(index += 1)} ` }),
          return: async () => {
            returned();
            return { done: true as const, value: undefined };
          },
        };
      },
    }));

    const session = await chatService.startTutorChat('u1', 'course-1', 'hi', 'en');
    for await (const chunk of session.chunks) {
      expect(chunk).toBe('chunk1 ');
      break;
    }

    expect(returned).toHaveBeenCalledTimes(1);
  });

  it('works with a stream iterator that has no return method', async () => {
    useStream(() => ({
      [Symbol.asyncIterator]() {
        const parts = ['a', 'b'];
        return { next: async () => ({ done: parts.length === 0, value: parts.shift() as string }) };
      },
    }));
    const session = await chatService.startTutorChat('u1', 'course-1', 'hi', 'en');
    expect(await collect(session.chunks)).toBe('ab');
  });
});

// ---------------------------------------------------------------- listChatHistory / clearChatHistory

describe('listChatHistory', () => {
  const rows = [
    { id: 'm2', role: 'ASSISTANT', content: 'answer', createdAt: new Date('2026-10-02T10:00:01Z') },
    { id: 'm1', role: 'USER', content: 'question', createdAt: new Date('2026-10-02T10:00:00Z') },
  ];

  it('returns the user messages newest first with pagination meta', async () => {
    db.aiChatMessage.count.mockResolvedValue(45);
    db.aiChatMessage.findMany.mockResolvedValue(rows);

    const result = await chatService.listChatHistory('u1', 'course-1', { page: 2, limit: 20 });

    expect(result.messages).toEqual([
      { id: 'm2', role: 'ASSISTANT', content: 'answer', createdAt: '2026-10-02T10:00:01.000Z' },
      { id: 'm1', role: 'USER', content: 'question', createdAt: '2026-10-02T10:00:00.000Z' },
    ]);
    expect(result.meta).toEqual({ page: 2, limit: 20, total: 45, totalPages: 3 });
    expect(db.aiChatMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u1', courseId: 'course-1' },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: 20,
        take: 20,
      }),
    );
  });

  it('defaults to the first page and returns an empty list', async () => {
    db.aiChatMessage.count.mockResolvedValue(0);
    db.aiChatMessage.findMany.mockResolvedValue([]);

    const result = await chatService.listChatHistory('u1', 'course-1', {});

    expect(result.messages).toEqual([]);
    expect(result.meta).toEqual({ page: 1, limit: 20, total: 0, totalPages: 0 });
  });

  it('requires enrollment', async () => {
    db.course.findUnique.mockResolvedValue({ id: 'course-1', enrollments: [] });
    await expect(chatService.listChatHistory('u1', 'course-1', {})).rejects.toMatchObject({
      status: 403,
      code: 'NOT_ENROLLED',
    });
    db.course.findUnique.mockResolvedValue(null);
    await expect(chatService.listChatHistory('u1', 'nope', {})).rejects.toMatchObject({
      status: 404,
      code: 'COURSE_NOT_FOUND',
    });
  });
});

describe('clearChatHistory', () => {
  it('deletes only the messages of this user in this course', async () => {
    db.aiChatMessage.deleteMany.mockResolvedValue({ count: 4 });
    await expect(chatService.clearChatHistory('u1', 'course-1')).resolves.toBeUndefined();
    expect(db.aiChatMessage.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1', courseId: 'course-1' },
    });
  });

  it('requires enrollment', async () => {
    db.course.findUnique.mockResolvedValue({ id: 'course-1', enrollments: [] });
    await expect(chatService.clearChatHistory('u1', 'course-1')).rejects.toMatchObject({
      status: 403,
      code: 'NOT_ENROLLED',
    });
    expect(db.aiChatMessage.deleteMany).not.toHaveBeenCalled();
  });
});
