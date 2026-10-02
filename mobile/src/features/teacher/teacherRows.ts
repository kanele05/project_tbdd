import type { ReviewDto, TeacherCoursesGroupDto, TeacherDetail } from '@/types/api';

export type TeacherTab = 'overview' | 'courses' | 'review';

/** One item of the single list that backs all three tabs of SC-18. */
export type TeacherRow =
  | { kind: 'overview'; teacher: TeacherDetail }
  | { kind: 'group'; group: TeacherCoursesGroupDto }
  | { kind: 'review'; review: ReviewDto };

export function getTeacherRowKey(row: TeacherRow): string {
  switch (row.kind) {
    case 'overview':
      return 'overview';
    case 'group':
      return `group-${row.group.category.id}`;
    case 'review':
      return `review-${row.review.id}`;
  }
}

export const getTeacherRowType = (row: TeacherRow): TeacherRow['kind'] => row.kind;

/** Rows to render for the active tab; empty while that tab has nothing loaded. */
export function buildTeacherRows(
  tab: TeacherTab,
  teacher: TeacherDetail | undefined,
  groups: TeacherCoursesGroupDto[] | undefined,
  reviews: ReviewDto[] | undefined,
): TeacherRow[] {
  if (!teacher) return [];
  switch (tab) {
    case 'overview':
      return [{ kind: 'overview', teacher }];
    case 'courses':
      return (groups ?? []).map((group) => ({ kind: 'group', group }));
    case 'review':
      return (reviews ?? []).map((review) => ({ kind: 'review', review }));
  }
}
