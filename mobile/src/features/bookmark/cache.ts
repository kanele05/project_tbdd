import type { InfiniteData } from '@tanstack/react-query';

import type { CourseSummary, Paginated } from '@/types/api';

/** One page of `GET /me/bookmarks`. */
export type BookmarksPage = Paginated<CourseSummary>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}

/**
 * Walk any cached value (home response, infinite pages, course detail, similar list, teacher
 * course groups...) and set `isBookmarked` on every course object (`{ id, isBookmarked }`) whose
 * id matches. Structural sharing is preserved: untouched branches keep their reference, and the
 * same reference is returned when nothing changed (so React Query skips the notification).
 */
export function setCourseBookmarked<T>(data: T, courseId: string, isBookmarked: boolean): T {
  if (Array.isArray(data)) {
    let hasChanged = false;
    const next = data.map((item: unknown) => {
      const mapped = setCourseBookmarked(item, courseId, isBookmarked);
      if (mapped !== item) hasChanged = true;
      return mapped;
    });
    return (hasChanged ? next : data) as T;
  }
  if (isPlainObject(data)) {
    let next: Record<string, unknown> | null = null;
    if (
      data.id === courseId &&
      typeof data.isBookmarked === 'boolean' &&
      data.isBookmarked !== isBookmarked
    ) {
      next = { ...data, isBookmarked };
    }
    for (const [key, value] of Object.entries(data)) {
      const mapped = setCourseBookmarked(value, courseId, isBookmarked);
      if (mapped !== value) {
        next = next ?? { ...data };
        next[key] = mapped;
      }
    }
    return (next ?? data) as T;
  }
  return data;
}

function isCourseSummaryLike(value: unknown, courseId: string): value is CourseSummary {
  return (
    isPlainObject(value) &&
    value.id === courseId &&
    typeof value.title === 'string' &&
    typeof value.thumbnailUrl === 'string' &&
    typeof value.priceCents === 'number' &&
    isPlainObject(value.teacher)
  );
}

/** Copy only the `CourseSummary` fields (a `CourseDetail` has many more). */
function pickCourseSummary(course: CourseSummary): CourseSummary {
  return {
    id: course.id,
    title: course.title,
    thumbnailUrl: course.thumbnailUrl,
    teacher: { id: course.teacher.id, fullName: course.teacher.fullName },
    priceCents: course.priceCents,
    originalPriceCents: course.originalPriceCents,
    badge: course.badge,
    discountPercent: course.discountPercent,
    ratingAvg: course.ratingAvg,
    ratingCount: course.ratingCount,
    lessonCount: course.lessonCount,
    totalDurationSec: course.totalDurationSec,
    isBookmarked: course.isBookmarked,
  };
}

/** Depth-first search for a course summary with the given id inside any cached value. */
export function findCourseSummary(data: unknown, courseId: string): CourseSummary | null {
  if (Array.isArray(data)) {
    for (const item of data as unknown[]) {
      const found = findCourseSummary(item, courseId);
      if (found) return found;
    }
    return null;
  }
  if (isPlainObject(data)) {
    if (isCourseSummaryLike(data, courseId)) return pickCourseSummary(data);
    for (const value of Object.values(data)) {
      const found = findCourseSummary(value, courseId);
      if (found) return found;
    }
  }
  return null;
}

/** `GET /me/bookmarks` (infinite): drop the course from every page and fix `meta.total`. */
export function removeFromBookmarks(
  data: InfiniteData<BookmarksPage>,
  courseId: string,
): InfiniteData<BookmarksPage> {
  const isPresent = data.pages.some((page) => page.data.some((course) => course.id === courseId));
  if (!isPresent) return data;
  return {
    ...data,
    pages: data.pages.map((page) => {
      const kept = page.data.filter((course) => course.id !== courseId);
      if (kept.length === page.data.length) return page;
      return {
        ...page,
        data: kept,
        meta: { ...page.meta, total: Math.max(0, page.meta.total - 1) },
      };
    }),
  };
}

/** `GET /me/bookmarks` (infinite): put a newly saved course at the top of the first page. */
export function addToBookmarks(
  data: InfiniteData<BookmarksPage>,
  course: CourseSummary,
): InfiniteData<BookmarksPage> {
  const isPresent = data.pages.some((page) => page.data.some((item) => item.id === course.id));
  const [first, ...rest] = data.pages;
  if (isPresent || !first) return data;
  const added: CourseSummary = { ...course, isBookmarked: true };
  return {
    ...data,
    pages: [
      {
        ...first,
        data: [added, ...first.data],
        meta: { ...first.meta, total: first.meta.total + 1 },
      },
      ...rest,
    ],
  };
}
