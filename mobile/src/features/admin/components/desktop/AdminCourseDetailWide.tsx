import { useState, type ReactNode } from 'react';

import { TwoColumn, WorkPanel } from '@/components/layout/work';
import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/i18n';
import type { AdminCourseDetailDto } from '@/types/api';

import { getReviewedSections } from '../../courseContent';
import { AiReviewPanel } from '../AiReviewPanel';
import { hasCourseActions } from '../CourseActionBar';
import { CourseInfoCard } from '../CourseInfoCard';
import { CurriculumPreview } from '../CurriculumPreview';
import { MissingNotice } from '../MissingNotice';
import { ModerationHistory } from '../ModerationHistory';
import { RevisionDiffView } from '../RevisionDiffView';

const SIDE_WIDTH = 360;

export type AdminCourseDetailWideProps = {
  detail: AdminCourseDetailDto;
  /** The decision card (`CourseActionBar` with `variant="panel"`); shown at the top of the side column. */
  decision: ReactNode;
};

/**
 * SC-33 on a PC window: the content under review (overview, diff, curriculum, history) on the left
 * and a sticky right column with the decision buttons and the AI pre-review panel, so the reviewer
 * can approve or reject without scrolling back to a bottom bar.
 */
export function AdminCourseDetailWide({ detail, decision }: AdminCourseDetailWideProps) {
  const { t } = useTranslation('admin');
  const [isAiRequested, setIsAiRequested] = useState(false);
  const isRevision = detail.reviewTarget === 'REVISION';
  const sections = getReviewedSections(detail);
  const missing = isRevision ? (detail.revision?.missing ?? []) : detail.missing;
  const pendingMissing = detail.reviewTarget ? missing : [];

  return (
    <TwoColumn
      testID="admin-detail-columns"
      sideWidth={SIDE_WIDTH}
      main={
        <>
          <CourseInfoCard detail={detail} isWide />
          <MissingNotice items={pendingMissing} />
          {detail.diff && detail.revision ? (
            <WorkPanel title={t('detail.changesTitle')}>
              <RevisionDiffView diff={detail.diff} />
            </WorkPanel>
          ) : null}
          <WorkPanel title={isRevision ? t('detail.curriculumProposed') : t('detail.curriculum')}>
            <CurriculumPreview sections={sections} />
          </WorkPanel>
          <WorkPanel title={t('history.title')}>
            <ModerationHistory entries={detail.moderation} />
          </WorkPanel>
        </>
      }
      side={
        <>
          {hasCourseActions(detail.status, detail.reviewTarget) ? (
            decision
          ) : (
            <WorkPanel title={t('detail.decisionTitle')}>
              <AppText variant="body" color="textSecondary">
                {t('detail.noDecision')}
              </AppText>
            </WorkPanel>
          )}
          <AiReviewPanel
            courseId={detail.id}
            isRequested={isAiRequested}
            onRequest={() => setIsAiRequested(true)}
          />
        </>
      }
    />
  );
}
