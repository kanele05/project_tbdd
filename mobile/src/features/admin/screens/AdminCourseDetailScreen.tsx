import { useState, type ReactNode } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { WorkHeader, WorkShell } from '@/components/layout/work';
import { AppText } from '@/components/ui/AppText';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, radius, spacing } from '@/theme';
import type { AdminCourseDetailDto } from '@/types/api';

import { AdminErrorState } from '../components/AdminErrorState';
import { AiReviewPanel } from '../components/AiReviewPanel';
import { CourseActionBar } from '../components/CourseActionBar';
import { CourseInfoCard } from '../components/CourseInfoCard';
import { CurriculumPreview } from '../components/CurriculumPreview';
import { AdminCourseDetailWide } from '../components/desktop/AdminCourseDetailWide';
import { MissingNotice } from '../components/MissingNotice';
import { ModerationHistory } from '../components/ModerationHistory';
import { ReasonModal } from '../components/ReasonModal';
import { RevisionDiffView } from '../components/RevisionDiffView';
import { getReviewedSections } from '../courseContent';
import { useAdminCourse } from '../hooks';
import { optionalReasonSchema, requiredReasonSchema } from '../schemas';
import { useModerationFlow } from '../useModerationFlow';

export type AdminCourseDetailScreenProps = { courseId: string };

function DetailSkeleton({ isFlush }: { isFlush: boolean }) {
  const styles = useStyles();
  return (
    <View style={[styles.content, isFlush ? styles.flush : null]} testID="admin-course-skeleton">
      <Skeleton height={190} borderRadius={radius.card} />
      <Skeleton height={28} width="70%" />
      <Skeleton height={64} borderRadius={radius.card} />
      <Skeleton height={120} borderRadius={radius.card} />
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <AppText variant="h3" accessibilityRole="header">
        {title}
      </AppText>
      {children}
    </View>
  );
}

function DetailBody({ detail }: { detail: AdminCourseDetailDto }) {
  const { t } = useTranslation('admin');
  const styles = useStyles();
  const [isAiRequested, setIsAiRequested] = useState(false);
  const isRevision = detail.reviewTarget === 'REVISION';
  const sections = getReviewedSections(detail);
  const missing = isRevision ? (detail.revision?.missing ?? []) : detail.missing;
  const pendingMissing = detail.reviewTarget ? missing : [];

  return (
    <View style={styles.content}>
      <CourseInfoCard detail={detail} />
      <MissingNotice items={pendingMissing} />
      <AiReviewPanel
        courseId={detail.id}
        isRequested={isAiRequested}
        onRequest={() => setIsAiRequested(true)}
      />
      {detail.diff && detail.revision ? (
        <Section title={t('detail.changesTitle')}>
          <RevisionDiffView diff={detail.diff} />
        </Section>
      ) : null}
      <Section title={isRevision ? t('detail.curriculumProposed') : t('detail.curriculum')}>
        <CurriculumPreview sections={sections} />
      </Section>
      <Section title={t('history.title')}>
        <ModerationHistory entries={detail.moderation} />
      </Section>
    </View>
  );
}

/**
 * SC-33 Review a course (FR-50/51): content preview, revision diff, AI pre-review, moderation
 * history and the decision bar (approve / reject with a reason / archive / restore).
 */
export function AdminCourseDetailScreen({ courseId }: AdminCourseDetailScreenProps) {
  const { t } = useTranslation('admin');
  const styles = useStyles();
  const { isWide } = useBreakpoint();
  const query = useAdminCourse(courseId);
  const { data: detail } = query;
  const flow = useModerationFlow(courseId, detail);

  let body: ReactNode = null;
  if (query.isPending) body = <DetailSkeleton isFlush={isWide} />;
  else if (query.isError && !detail) {
    body = (
      <AdminErrorState
        error={query.error}
        title={t('detail.loadFailed')}
        onRetry={() => void query.refetch()}
      />
    );
  } else if (detail) body = <DetailBody detail={detail} />;

  const renderActions = (variant: 'bar' | 'panel'): ReactNode =>
    detail ? (
      <CourseActionBar
        status={detail.status}
        reviewTarget={detail.reviewTarget}
        isApproving={flow.approve.isPending}
        isRestoring={flow.restore.isPending}
        onApprove={() => void flow.approve.run()}
        onReject={flow.reject.open}
        onArchive={flow.archive.open}
        onRestore={() => void flow.restore.run()}
        variant={variant}
      />
    ) : null;
  const modals = (
    <>
      <ReasonModal
        isVisible={flow.reject.isOpen}
        title={t(flow.isRevision ? 'reject.revisionTitle' : 'reject.courseTitle')}
        message={t('reject.message')}
        label={t('reject.label')}
        submitLabel={t('actions.reject')}
        schema={requiredReasonSchema}
        isSubmitting={flow.reject.isPending}
        errorMessage={flow.reject.errorMessage}
        onSubmit={flow.reject.submit}
        onClose={flow.reject.close}
      />
      <ReasonModal
        isVisible={flow.archive.isOpen}
        title={t('archive.title')}
        message={t('archive.message')}
        label={t('archive.label')}
        submitLabel={t('actions.archive')}
        schema={optionalReasonSchema}
        isSubmitting={flow.archive.isPending}
        errorMessage={flow.archive.errorMessage}
        onSubmit={flow.archive.submit}
        onClose={flow.archive.close}
      />
    </>
  );

  if (isWide) {
    return (
      <WorkShell testID="admin-course-detail-desktop">
        <WorkHeader title={detail?.title ?? t('detail.title')} hasBack />
        {detail ? (
          <AdminCourseDetailWide detail={detail} decision={renderActions('panel')} />
        ) : (
          body
        )}
        {modals}
      </WorkShell>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title={detail?.title ?? t('detail.title')} />
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
        }
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {body}
      </ScrollView>
      {renderActions('bar')}
      {modals}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  scroll: { paddingBottom: spacing.xxl },
  content: {
    gap: spacing.xl,
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing.sm,
  },
  section: { gap: spacing.md },
  flush: { paddingHorizontal: 0, paddingTop: 0 },
}));
