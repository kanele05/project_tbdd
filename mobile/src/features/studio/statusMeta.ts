import type { FeatherIconName } from '@/components/ui/icons';
import type { PaletteToken } from '@/theme';
import type { CourseStatus, ModerationAction, RevisionStatus } from '@/types/api';

export type StatusLabelKey =
  CourseStatus | 'revisionOPEN' | 'revisionPENDING_REVIEW' | 'revisionREJECTED';

/** Fill / text / icon of a status chip. Every pair is an AA-checked `Xxx` / `onXxx` palette pair. */
export type StatusTone = {
  /** i18n key under `studio:status`. */
  labelKey: StatusLabelKey;
  icon: FeatherIconName;
  background: PaletteToken;
  text: PaletteToken;
  /** Outline color; equals the fill for solid chips. */
  border: PaletteToken;
};

const NEUTRAL = { background: 'surface', text: 'textSecondary', border: 'border' } as const;

export const COURSE_STATUS_TONE: Record<CourseStatus, StatusTone> = {
  DRAFT: { labelKey: 'DRAFT', icon: 'edit-2', ...NEUTRAL },
  PENDING_REVIEW: {
    labelKey: 'PENDING_REVIEW',
    icon: 'clock',
    background: 'gold',
    text: 'onGold',
    border: 'gold',
  },
  PUBLISHED: {
    labelKey: 'PUBLISHED',
    icon: 'check-circle',
    background: 'success',
    text: 'onSuccess',
    border: 'success',
  },
  REJECTED: {
    labelKey: 'REJECTED',
    icon: 'x-circle',
    background: 'danger',
    text: 'onDanger',
    border: 'danger',
  },
  ARCHIVED: {
    labelKey: 'ARCHIVED',
    icon: 'eye-off',
    background: 'secondary',
    text: 'onSecondary',
    border: 'secondary',
  },
};

export const REVISION_STATUS_TONE: Record<RevisionStatus, StatusTone> = {
  OPEN: { labelKey: 'revisionOPEN', icon: 'edit-3', ...NEUTRAL },
  PENDING_REVIEW: {
    labelKey: 'revisionPENDING_REVIEW',
    icon: 'clock',
    background: 'gold',
    text: 'onGold',
    border: 'gold',
  },
  REJECTED: {
    labelKey: 'revisionREJECTED',
    icon: 'x-circle',
    background: 'danger',
    text: 'onDanger',
    border: 'danger',
  },
};

/** Icon of a moderation-history row. */
export const MODERATION_ICON: Record<ModerationAction, FeatherIconName> = {
  SUBMITTED: 'send',
  WITHDRAWN: 'corner-up-left',
  APPROVED: 'check-circle',
  REJECTED: 'x-circle',
  ARCHIVED: 'eye-off',
  RESTORED: 'eye',
};
