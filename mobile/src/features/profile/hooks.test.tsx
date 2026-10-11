import { act, renderHook, waitFor } from '@testing-library/react-native';

import { makeCourse } from '@/components/course/courseFixtures';
import {
  createQueryWrapper,
  createTestQueryClient,
  flushNotifications,
  makePage,
} from '@/test/queryWrapper';
import type { MeStatsDto } from '@/types/api';

import { profileApi } from './api';
import { useBookmarks, useMeStats } from './hooks';

jest.mock('./api', () => ({ profileApi: { stats: jest.fn(), bookmarks: jest.fn() } }));

// Simulate the screen focus: the callback runs on mount; tests re-run the latest one by hand.
let mockFocusCallbacks: (() => void)[] = [];
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    useFocusEffect: (callback: () => void) => {
      useEffect(() => {
        mockFocusCallbacks.push(callback);
        callback();
      }, [callback]);
    },
  };
});

const api = jest.mocked(profileApi);

// Spreading reads every field during render, so TanStack Query re-renders on any change even when
// the mocked request resolves before the test first reads `result.current` (tracked props).
function useStatsSpread() {
  return { ...useMeStats() };
}

const STATS: MeStatsDto = { savedCount: 1, ongoingCount: 2, completedCount: 3, learningSec: 3600 };

afterEach(async () => {
  await act(flushNotifications);
  mockFocusCallbacks = [];
});

describe('useMeStats', () => {
  beforeEach(() => jest.clearAllMocks());

  it('loads the stats and does not refetch on the very first focus', async () => {
    api.stats.mockResolvedValue(STATS);
    const { result } = await renderHook(() => useStatsSpread(), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.data).toEqual(STATS));
    expect(api.stats).toHaveBeenCalledTimes(1);
  });

  it('refetches when the screen regains focus', async () => {
    api.stats.mockResolvedValue(STATS);
    const { result, rerender } = await renderHook(() => useStatsSpread(), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // `refetch` is stable, so re-run the latest registered focus callback like the navigator does.
    await act(async () => {
      mockFocusCallbacks[mockFocusCallbacks.length - 1]?.();
      await flushNotifications();
    });
    await rerender({});

    await waitFor(() => expect(api.stats).toHaveBeenCalledTimes(2));
  });
});

describe('useBookmarks', () => {
  beforeEach(() => jest.clearAllMocks());

  it('flattens the pages into a course list and requests the next page', async () => {
    api.bookmarks
      .mockResolvedValueOnce(makePage([makeCourse({ id: 'a' })], 1, 2))
      .mockResolvedValueOnce(makePage([makeCourse({ id: 'b' })], 2, 2));
    const { result } = await renderHook(() => useBookmarks(), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.courses.map((c) => c.id)).toEqual(['a']));
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => expect(result.current.courses.map((c) => c.id)).toEqual(['a', 'b']));
    expect(api.bookmarks).toHaveBeenNthCalledWith(2, 2);
    expect(result.current.hasNextPage).toBe(false);
  });
});
