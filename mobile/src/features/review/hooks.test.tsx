import { act, renderHook, waitFor } from '@testing-library/react-native';

import { queryKeys } from '@/lib/queryKeys';
import { createQueryWrapper, createTestQueryClient, flushNotifications } from '@/test/queryWrapper';
import type { ReviewDto, ReviewSummaryDto, ReviewsPage } from '@/types/api';

import { reviewApi } from './api';
import {
  REVIEW_FILTERS,
  useCourseReviews,
  useMyReview,
  useReviewSummary,
  useSaveReview,
} from './hooks';

jest.mock('./api', () => ({
  reviewApi: { list: jest.fn(), mine: jest.fn(), save: jest.fn() },
}));

const mocked = reviewApi as jest.Mocked<typeof reviewApi>;

const SUMMARY: ReviewSummaryDto = {
  avg: 4.5,
  count: 2,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 1 },
};

function makeReview(overrides: Partial<ReviewDto> = {}): ReviewDto {
  return {
    id: 'r1',
    rating: 5,
    content: 'Great course, learned a lot',
    createdAt: '2026-10-01T00:00:00.000Z',
    user: { id: 'u1', fullName: 'Jane', avatarUrl: null },
    ...overrides,
  };
}

function makeReviewsPage(reviews: ReviewDto[], page = 1, totalPages = 1): ReviewsPage {
  return {
    data: reviews,
    meta: { page, limit: 20, total: reviews.length, totalPages, summary: SUMMARY },
  };
}

afterEach(async () => {
  await act(flushNotifications);
});

describe('REVIEW_FILTERS', () => {
  it('lists "all" first, then 5 down to 1 stars', () => {
    expect(REVIEW_FILTERS).toEqual(['all', 5, 4, 3, 2, 1]);
  });
});

describe('useCourseReviews', () => {
  beforeEach(() => jest.clearAllMocks());

  it('omits the rating param for the "all" filter', async () => {
    mocked.list.mockResolvedValue(makeReviewsPage([makeReview()]));
    const client = createTestQueryClient();
    const { result } = await renderHook(() => useCourseReviews('c1', 'all'), {
      wrapper: createQueryWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocked.list).toHaveBeenCalledWith('c1', { rating: undefined, page: 1 });
  });

  it('sends the star rating for a star filter and fetches the next page', async () => {
    mocked.list
      .mockResolvedValueOnce(makeReviewsPage([makeReview()], 1, 2))
      .mockResolvedValueOnce(makeReviewsPage([makeReview({ id: 'r2' })], 2, 2));
    const client = createTestQueryClient();
    const { result } = await renderHook(() => useCourseReviews('c1', 4), {
      wrapper: createQueryWrapper(client),
    });

    await waitFor(() => expect(result.current.hasNextPage).toBe(true));
    expect(mocked.list).toHaveBeenNthCalledWith(1, 'c1', { rating: 4, page: 1 });

    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(mocked.list).toHaveBeenNthCalledWith(2, 'c1', { rating: 4, page: 2 });
    expect(result.current.hasNextPage).toBe(false);
  });
});

describe('useReviewSummary', () => {
  beforeEach(() => jest.clearAllMocks());

  it('selects the summary of the first page and shares the unfiltered list cache', async () => {
    mocked.list.mockResolvedValue(makeReviewsPage([makeReview()]));
    const client = createTestQueryClient();
    const { result } = await renderHook(() => useReviewSummary('c1'), {
      wrapper: createQueryWrapper(client),
    });

    await waitFor(() => expect(result.current.data).toEqual(SUMMARY));
    expect(client.getQueryData(queryKeys.courseReviews('c1', 'all'))).toBeDefined();
  });
});

describe('useMyReview', () => {
  beforeEach(() => jest.clearAllMocks());

  it('loads my review when enabled', async () => {
    mocked.mine.mockResolvedValue(makeReview());
    const client = createTestQueryClient();
    const { result } = await renderHook(() => useMyReview('c1'), {
      wrapper: createQueryWrapper(client),
    });

    await waitFor(() => expect(result.current.data?.id).toBe('r1'));
  });

  it('does not call the server when disabled (not enrolled / logged out)', async () => {
    const client = createTestQueryClient();
    const { result } = await renderHook(() => useMyReview('c1', false), {
      wrapper: createQueryWrapper(client),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mocked.mine).not.toHaveBeenCalled();
  });
});

describe('useSaveReview', () => {
  beforeEach(() => jest.clearAllMocks());

  it('caches the saved review as mine and refreshes the lists and the course rating', async () => {
    const saved = makeReview({ rating: 4, content: 'Updated review text here' });
    mocked.save.mockResolvedValue(saved);
    const client = createTestQueryClient();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const { result } = await renderHook(() => useSaveReview('c1'), {
      wrapper: createQueryWrapper(client),
    });

    await act(async () => {
      await result.current.mutateAsync({ rating: 4, content: 'Updated review text here' });
      await flushNotifications();
    });

    expect(mocked.save).toHaveBeenCalledWith('c1', {
      rating: 4,
      content: 'Updated review text here',
    });
    expect(client.getQueryData(queryKeys.courseMyReview('c1'))).toEqual(saved);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.courseReviewsAll('c1') });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.course('c1'), exact: true });
  });

  it('still refreshes the lists when saving fails, without caching a review', async () => {
    mocked.save.mockRejectedValue(new Error('403'));
    const client = createTestQueryClient();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const { result } = await renderHook(() => useSaveReview('c1'), {
      wrapper: createQueryWrapper(client),
    });

    await act(async () => {
      await result.current
        .mutateAsync({ rating: 1, content: 'Not allowed to post' })
        .catch(() => undefined);
      await flushNotifications();
    });

    expect(client.getQueryData(queryKeys.courseMyReview('c1'))).toBeUndefined();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.courseReviewsAll('c1') });
  });
});
