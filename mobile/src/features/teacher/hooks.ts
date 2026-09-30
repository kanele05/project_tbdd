export type UseToggleFollowResult = {
  /** Optimistic follow/unfollow; updates teacher detail + course detail caches, rolls back on error. */
  toggleFollow: (teacherId: string, isFollowed: boolean) => void;
  isPending: boolean;
};

/**
 * Contract stub — owner A (M-24, FR-20). Used by SC-09 Overview (owner B) and SC-18.
 * Replace the body; keep the exported name and return shape.
 */
export function useToggleFollow(): UseToggleFollowResult {
  return { toggleFollow: () => undefined, isPending: false };
}
