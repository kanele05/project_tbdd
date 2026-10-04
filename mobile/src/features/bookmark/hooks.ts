import {
  onlineManager,
  useMutation,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { useCallback } from 'react';

import { showToast } from '@/components/ui/Toast';
import { tr } from '@/i18n';
import { AppError, getErrorMessage } from '@/lib/appError';
import { queryKeys } from '@/lib/queryKeys';
import type { CourseSummary, MeStatsDto } from '@/types/api';

import { bookmarkApi } from './api';
import {
  addToBookmarks,
  findCourseSummary,
  removeFromBookmarks,
  setCourseBookmarked,
  type BookmarksPage,
} from './cache';

export type UseToggleBookmarkResult = {
  /**
   * Optimistically flips the bookmark in every cached course list/detail, rolls back (and shows
   * a toast) when the request fails.
   *
   * - `isBookmarked` is the course's CURRENT state (`course.isBookmarked`): `true` -> the course
   *   is un-saved (`DELETE`), `false` -> it is saved (`PUT`).
   * - `course` is optional; when saving a course that is in no cached list it lets the Saved
   *   courses list show it immediately (e.g. the "Undo" on the Profile screen).
   */
  toggleBookmark: (courseId: string, isBookmarked: boolean, course?: CourseSummary) => void;
  isPending: boolean;
};

type Variables = { courseId: string; isBookmarked: boolean; course?: CourseSummary };

type BookmarksSnapshot = [QueryKey, InfiniteData<BookmarksPage> | undefined];

type Context = {
  snapshots: BookmarksSnapshot[];
  isStatsAdjusted: boolean;
};

function isBookmarksKey(queryKey: QueryKey): boolean {
  const [root, sub] = queryKey;
  return root === 'me' && sub === 'bookmarks';
}

/** Queries that may hold course objects, i.e. whose in-flight fetch could overwrite our patch. */
function mayHoldCourses(queryKey: QueryKey): boolean {
  const [root] = queryKey;
  return (
    root === 'home' ||
    root === 'courses' ||
    root === 'course' ||
    root === 'teacher' ||
    root === 'cart' ||
    isBookmarksKey(queryKey)
  );
}

/** Set `isBookmarked` on the course in every cache except the Saved list (handled separately). */
function patchAllCaches(queryClient: QueryClient, courseId: string, isBookmarked: boolean): void {
  for (const query of queryClient.getQueryCache().getAll()) {
    if (isBookmarksKey(query.queryKey)) continue;
    const data: unknown = query.state.data;
    if (data === undefined) continue;
    const patched = setCourseBookmarked(data, courseId, isBookmarked);
    if (patched !== data) {
      // Keep `dataUpdatedAt`: the optimistic patch must not make stale data look fresh.
      queryClient.setQueryData(query.queryKey, patched, { updatedAt: query.state.dataUpdatedAt });
    }
  }
}

function findInCaches(queryClient: QueryClient, courseId: string): CourseSummary | null {
  for (const query of queryClient.getQueryCache().getAll()) {
    const found = findCourseSummary(query.state.data, courseId);
    if (found) return found;
  }
  return null;
}

function adjustSavedCount(queryClient: QueryClient, delta: number): boolean {
  const stats = queryClient.getQueryData<MeStatsDto>(queryKeys.meStats());
  if (!stats) return false;
  queryClient.setQueryData<MeStatsDto>(
    queryKeys.meStats(),
    { ...stats, savedCount: Math.max(0, stats.savedCount + delta) },
    { updatedAt: queryClient.getQueryState(queryKeys.meStats())?.dataUpdatedAt },
  );
  return true;
}

/**
 * Bookmark toggle (FR-12, PLAN.md §10): `onMutate` patches every cache that contains the course
 * (`home`, `courses/list`, `course/:id`, `similar`, `teacher/:id/courses`, cart...) and the Saved
 * list (removed on un-save, inserted on save); `onError` rolls everything back + toast;
 * `onSettled` refreshes the profile stats and the Saved list from the server.
 */
export function useToggleBookmark(): UseToggleBookmarkResult {
  const queryClient = useQueryClient();

  const mutation = useMutation<void, unknown, Variables, Context>({
    mutationFn: ({ courseId, isBookmarked }) =>
      isBookmarked ? bookmarkApi.remove(courseId) : bookmarkApi.add(courseId),

    onMutate: async ({ courseId, isBookmarked, course }) => {
      // Offline: fail fast (writes are blocked, PLAN.md §10) instead of pausing the mutation.
      if (!onlineManager.isOnline()) {
        throw new AppError({ status: 0, code: 'OFFLINE', message: tr('errors:offline') });
      }
      const willBeBookmarked = !isBookmarked;
      await queryClient.cancelQueries({ predicate: (query) => mayHoldCourses(query.queryKey) });

      // Look the summary up before patching so a newly saved course can join the Saved list.
      const summary = willBeBookmarked ? (course ?? findInCaches(queryClient, courseId)) : null;

      patchAllCaches(queryClient, courseId, willBeBookmarked);

      const snapshots: BookmarksSnapshot[] = [];
      for (const [queryKey, data] of queryClient.getQueriesData<InfiniteData<BookmarksPage>>({
        queryKey: queryKeys.meBookmarks(),
      })) {
        if (!data) continue;
        snapshots.push([queryKey, data]);
        const next = willBeBookmarked
          ? summary
            ? addToBookmarks(data, summary)
            : data
          : removeFromBookmarks(data, courseId);
        if (next !== data) {
          queryClient.setQueryData(queryKey, next, {
            updatedAt: queryClient.getQueryState(queryKey)?.dataUpdatedAt,
          });
        }
      }

      const isStatsAdjusted = adjustSavedCount(queryClient, willBeBookmarked ? 1 : -1);
      return { snapshots, isStatsAdjusted };
    },

    onError: (error, { courseId, isBookmarked }, context) => {
      patchAllCaches(queryClient, courseId, isBookmarked);
      for (const [queryKey, data] of context?.snapshots ?? []) {
        queryClient.setQueryData(queryKey, data, {
          updatedAt: queryClient.getQueryState(queryKey)?.dataUpdatedAt,
        });
      }
      if (context?.isStatsAdjusted) adjustSavedCount(queryClient, isBookmarked ? 1 : -1);
      showToast(getErrorMessage(error), { type: 'error' });
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.meStats() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.meBookmarks() });
    },
  });

  const { mutate } = mutation;
  const toggleBookmark = useCallback(
    (courseId: string, isBookmarked: boolean, course?: CourseSummary) =>
      mutate({ courseId, isBookmarked, course }),
    [mutate],
  );

  return { toggleBookmark, isPending: mutation.isPending };
}
