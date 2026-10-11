import { memo } from 'react';

import { Badge } from '@/components/ui/Badge';
import { useTranslation } from '@/i18n';
import type { CourseStatus, RevisionStatus } from '@/types/api';

import { REVISION_TONE, STATUS_TONE } from '../adminMeta';

export type CourseStatusBadgeProps =
  | { status: CourseStatus; revisionStatus?: undefined }
  | { revisionStatus: RevisionStatus; status?: undefined };

/** Pill with the (translated) status of a course, or of its revision. The word carries the meaning, the tone only supports it. */
function CourseStatusBadgeBase({ status, revisionStatus }: CourseStatusBadgeProps) {
  const { t } = useTranslation('admin');
  if (revisionStatus) {
    return (
      <Badge
        label={t(`revisionStatus.${revisionStatus}`)}
        tone={REVISION_TONE[revisionStatus]}
        shape="pill"
      />
    );
  }
  if (!status) return null;
  return <Badge label={t(`status.${status}`)} tone={STATUS_TONE[status]} shape="pill" />;
}

export const CourseStatusBadge = memo(CourseStatusBadgeBase);
