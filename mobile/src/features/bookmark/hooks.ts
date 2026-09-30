export type UseToggleBookmarkResult = {
  /** Optimistically flips the bookmark in every cached course list/detail, rolls back on error. */
  toggleBookmark: (courseId: string, isBookmarked: boolean) => void;
  isPending: boolean;
};

/**
 * Contract stub — owner B (M-16, API by C). Used by every course card consumer.
 * Replace the body; keep the exported name and return shape.
 */
export function useToggleBookmark(): UseToggleBookmarkResult {
  return { toggleBookmark: () => undefined, isPending: false };
}
