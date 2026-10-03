import type { QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { createTestQueryClient, makePage } from '@/test/queryWrapper';
import type { QuestionDto } from '@/types/api';

import {
  findCachedQuestion,
  isCourseQuestionsQuery,
  patchQuestionEverywhere,
  restoreQuestionCaches,
  snapshotQuestionCaches,
  type QuestionsData,
} from './cache';

function makeQuestion(overrides: Partial<QuestionDto> = {}): QuestionDto {
  return {
    id: 'q1',
    content: 'How?',
    createdAt: '2026-10-01T00:00:00.000Z',
    likeCount: 1,
    answerCount: 0,
    isLiked: false,
    user: { id: 'u1', fullName: 'Jane', avatarUrl: null },
    ...overrides,
  };
}

function list(...questions: QuestionDto[]): QuestionsData {
  return { pageParams: [1], pages: [makePage(questions)] };
}

function seed(client: QueryClient) {
  client.setQueryData(
    queryKeys.courseQuestions('c1'),
    list(makeQuestion(), makeQuestion({ id: 'q2' })),
  );
  client.setQueryData(queryKeys.courseQuestions('c2'), list(makeQuestion({ id: 'q3' })));
  client.setQueryData(queryKeys.question('q1'), makeQuestion());
}

const readList = (client: QueryClient, courseId: string) =>
  client.getQueryData<QuestionsData>(queryKeys.courseQuestions(courseId))?.pages[0]?.data;

describe('isCourseQuestionsQuery', () => {
  const client = createTestQueryClient();
  afterAll(() => client.clear());

  it('matches only the question list of a course', () => {
    client.setQueryData(queryKeys.courseQuestions('c1'), list());
    client.setQueryData(queryKeys.question('q1'), makeQuestion());
    client.setQueryData(queryKeys.course('c1'), {});

    const matches = client
      .getQueryCache()
      .findAll({ predicate: isCourseQuestionsQuery })
      .map((query) => query.queryKey);
    expect(matches).toEqual([queryKeys.courseQuestions('c1')]);
  });
});

describe('patchQuestionEverywhere', () => {
  it('patches the detail and the question in every course list, leaving others alone', () => {
    const client = createTestQueryClient();
    seed(client);
    client.setQueryData(
      queryKeys.courseQuestions('c2'),
      list(makeQuestion(), makeQuestion({ id: 'q3' })),
    );

    patchQuestionEverywhere(client, 'q1', (question) => ({ ...question, likeCount: 99 }));

    expect(client.getQueryData<QuestionDto>(queryKeys.question('q1'))?.likeCount).toBe(99);
    expect(readList(client, 'c1')?.map((question) => question.likeCount)).toEqual([99, 1]);
    expect(readList(client, 'c2')?.map((question) => question.likeCount)).toEqual([99, 1]);
    client.clear();
  });

  it('does not create caches that were not loaded', () => {
    const client = createTestQueryClient();
    patchQuestionEverywhere(client, 'q1', (question) => ({ ...question, likeCount: 5 }));
    expect(client.getQueryData(queryKeys.question('q1'))).toBeUndefined();
    client.clear();
  });
});

describe('findCachedQuestion', () => {
  it('finds a question that is loaded in any list', () => {
    const client = createTestQueryClient();
    seed(client);
    expect(findCachedQuestion(client, 'q3')?.id).toBe('q3');
    client.clear();
  });

  it('returns undefined when no list has it', () => {
    const client = createTestQueryClient();
    seed(client);
    expect(findCachedQuestion(client, 'nope')).toBeUndefined();
    client.clear();
  });
});

describe('snapshot and restore', () => {
  it('rolls every cache back to the state before an optimistic patch', () => {
    const client = createTestQueryClient();
    seed(client);
    const snapshot = snapshotQuestionCaches(client, 'q1');

    patchQuestionEverywhere(client, 'q1', (question) => ({
      ...question,
      isLiked: true,
      likeCount: 2,
    }));
    expect(readList(client, 'c1')?.[0]).toMatchObject({ isLiked: true, likeCount: 2 });

    restoreQuestionCaches(client, 'q1', snapshot);
    expect(readList(client, 'c1')?.[0]).toMatchObject({ isLiked: false, likeCount: 1 });
    expect(client.getQueryData<QuestionDto>(queryKeys.question('q1'))).toMatchObject({
      isLiked: false,
      likeCount: 1,
    });
    client.clear();
  });

  it('restores lists even when the detail was not cached', () => {
    const client = createTestQueryClient();
    client.setQueryData(queryKeys.courseQuestions('c1'), list(makeQuestion()));
    const snapshot = snapshotQuestionCaches(client, 'q1');
    expect(snapshot.single).toBeUndefined();

    patchQuestionEverywhere(client, 'q1', (question) => ({ ...question, likeCount: 50 }));
    restoreQuestionCaches(client, 'q1', snapshot);

    expect(readList(client, 'c1')?.[0]?.likeCount).toBe(1);
    expect(client.getQueryData(queryKeys.question('q1'))).toBeUndefined();
    client.clear();
  });
});
