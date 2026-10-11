import type { InfiniteData } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { createTestQueryClient } from '@/test/queryWrapper';
import type { AnswerDto, Paginated, ReviewDto } from '@/types/api';

import { mapPages, patchAnswerPin, patchReviewEverywhere, sortPinnedFirst } from './cache';

function answer(id: string, isPinned = false): AnswerDto {
  return {
    id,
    content: id,
    createdAt: '2026-10-01T00:00:00.000Z',
    user: { id: 'u', fullName: 'U', avatarUrl: null },
    isInstructor: false,
    isPinned,
  };
}

function review(id: string): ReviewDto {
  return {
    id,
    rating: 5,
    content: 'Great course',
    createdAt: '2026-10-01T00:00:00.000Z',
    user: { id: 'u', fullName: 'U', avatarUrl: null },
    teacherReply: null,
    teacherRepliedAt: null,
  };
}

function pages<T>(...lists: T[][]): InfiniteData<Paginated<T>, number> {
  return {
    pageParams: lists.map((_, index) => index + 1),
    pages: lists.map((data, index) => ({
      data,
      meta: { page: index + 1, limit: 2, total: 4, totalPages: lists.length },
    })),
  };
}

describe('sortPinnedFirst', () => {
  it('moves the pinned answer to the top and keeps the size of every page', () => {
    const sorted = sortPinnedFirst(
      pages([answer('a'), answer('b')], [answer('c', true), answer('d')]),
    );

    expect(sorted?.pages.map((page) => page.data.map((item) => item.id))).toEqual([
      ['c', 'a'],
      ['b', 'd'],
    ]);
  });

  it('returns undefined for no data', () => {
    expect(sortPinnedFirst(undefined)).toBeUndefined();
  });
});

describe('mapPages', () => {
  it('maps the items and keeps the meta of every page', () => {
    const mapped = mapPages<ReviewDto, Paginated<ReviewDto>>(pages([review('r1')]), (item) => ({
      ...item,
      rating: 1,
    }));

    expect(mapped?.pages[0]?.data[0]?.rating).toBe(1);
    expect(mapped?.pages[0]?.meta.totalPages).toBe(1);
  });
});

describe('patchAnswerPin', () => {
  it('pins one answer, unpins the previous one and puts the pinned answer first', () => {
    const client = createTestQueryClient();
    client.setQueryData(
      queryKeys.questionAnswers('q1'),
      pages([answer('a', true), answer('b'), answer('c')]),
    );

    patchAnswerPin(client, 'q1', 'c', true);

    const data = client.getQueryData<InfiniteData<Paginated<AnswerDto>, number>>(
      queryKeys.questionAnswers('q1'),
    );
    expect(data?.pages[0]?.data.map((item) => [item.id, item.isPinned])).toEqual([
      ['c', true],
      ['a', false],
      ['b', false],
    ]);
  });
});

describe('patchReviewEverywhere', () => {
  it('patches the review in the course lists, the teacher lists and "my review"', () => {
    const client = createTestQueryClient();
    client.setQueryData(queryKeys.courseReviews('c1', 'all'), pages([review('r1'), review('r2')]));
    client.setQueryData(queryKeys.teacherReviews('t1'), pages([review('r1')]));
    client.setQueryData(queryKeys.courseMyReview('c1'), review('r1'));

    patchReviewEverywhere(client, 'r1', (item) => ({ ...item, teacherReply: 'Thanks' }));

    const course = client.getQueryData<InfiniteData<Paginated<ReviewDto>, number>>(
      queryKeys.courseReviews('c1', 'all'),
    );
    expect(course?.pages[0]?.data.map((item) => item.teacherReply)).toEqual(['Thanks', null]);
    const teacher = client.getQueryData<InfiniteData<Paginated<ReviewDto>, number>>(
      queryKeys.teacherReviews('t1'),
    );
    expect(teacher?.pages[0]?.data[0]?.teacherReply).toBe('Thanks');
    expect(client.getQueryData<ReviewDto>(queryKeys.courseMyReview('c1'))?.teacherReply).toBe(
      'Thanks',
    );
  });
});
