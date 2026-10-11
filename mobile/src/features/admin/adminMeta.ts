import type { BadgeTone } from '@/components/ui/Badge';
import type { FeatherIconName } from '@/components/ui/icons';
import type {
  AdminCourseListParams,
  AdminCourseQueueItemDto,
  AiReviewSeverity,
  CourseStatus,
  ModerationAction,
  Role,
  RevisionStatus,
} from '@/types/api';

/** Order in which statuses / roles are listed on the dashboard. */
export const COURSE_STATUS_ORDER: readonly CourseStatus[] = [
  'PUBLISHED',
  'PENDING_REVIEW',
  'DRAFT',
  'REJECTED',
  'ARCHIVED',
];
export const ROLE_ORDER: readonly Role[] = ['STUDENT', 'TEACHER', 'ADMIN'];

/** Page size of the admin lists. */
export const ADMIN_PAGE_SIZE = 20;

/** Lengths of the moderation reasons (BR-28 / contract §5). */
export const REASON_MIN_LENGTH = 5;
export const REASON_MAX_LENGTH = 500;

export type QueueType = 'course' | 'revision';
export type QueueStatus = 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';

/** Status filters that make sense for each queue type (revisions are never published/archived). */
export const QUEUE_STATUSES: Record<QueueType, readonly QueueStatus[]> = {
  course: ['PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED'],
  revision: ['PENDING_REVIEW', 'REJECTED'],
};

/** Keeps the status valid when the queue type changes (a revision cannot be "published"). */
export function normalizeQueueStatus(type: QueueType, status: QueueStatus): QueueStatus {
  return QUEUE_STATUSES[type].includes(status) ? status : 'PENDING_REVIEW';
}

export function buildQueueParams(type: QueueType, status: QueueStatus): AdminCourseListParams {
  return { type, status: normalizeQueueStatus(type, status), limit: ADMIN_PAGE_SIZE };
}

export const STATUS_TONE: Record<CourseStatus, BadgeTone> = {
  DRAFT: 'secondary',
  PENDING_REVIEW: 'gold',
  PUBLISHED: 'success',
  REJECTED: 'danger',
  ARCHIVED: 'secondary',
};

export const STATUS_ICON: Record<CourseStatus, FeatherIconName> = {
  DRAFT: 'edit-3',
  PENDING_REVIEW: 'clock',
  PUBLISHED: 'check-circle',
  REJECTED: 'x-circle',
  ARCHIVED: 'archive',
};

export const REVISION_TONE: Record<RevisionStatus, BadgeTone> = {
  OPEN: 'secondary',
  PENDING_REVIEW: 'gold',
  REJECTED: 'danger',
};

export const SEVERITY_TONE: Record<AiReviewSeverity, BadgeTone> = {
  high: 'danger',
  medium: 'gold',
  low: 'secondary',
};

export const MODERATION_ICON: Record<ModerationAction, FeatherIconName> = {
  SUBMITTED: 'send',
  WITHDRAWN: 'corner-up-left',
  APPROVED: 'check-circle',
  REJECTED: 'x-circle',
  ARCHIVED: 'archive',
  RESTORED: 'rotate-ccw',
};

/** A queue row is a pending revision of a live course (not a brand-new course). */
export function isRevisionItem(item: Pick<AdminCourseQueueItemDto, 'type'>): boolean {
  return item.type === 'REVISION';
}

/** Whole-number percent of `part` in `total` (0 when `total` is 0). */
export function toPercent(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

/** True when the string is a YouTube watch link we may hand to the system (http/https only). */
export function isOpenableUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}
