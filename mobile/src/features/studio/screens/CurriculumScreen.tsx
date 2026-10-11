import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WorkHeader, WorkShell } from '@/components/layout/work';
import { ErrorState } from '@/components/ui/ErrorState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { isOfflineWithoutData, OFFLINE_QUERY_ERROR } from '@/features/learning/queryStatus';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, spacing } from '@/theme';

import { CurriculumContent } from '../components/CurriculumContent';
import { useStudioCourse } from '../hooks';

/**
 * SC-25 Curriculum editor (FR-40): the standalone screen around `CurriculumContent`, which the
 * course wizard embeds as its Lessons step.
 */
export function CurriculumScreen({ courseId }: { courseId: string }) {
  const { t } = useTranslation('studio');
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { isWide } = useBreakpoint();
  const query = useStudioCourse(courseId);
  const detail = query.data;

  let body;
  if (isOfflineWithoutData(query)) {
    body = <ErrorState error={OFFLINE_QUERY_ERROR} onRetry={() => void query.refetch()} />;
  } else if (query.isPending) {
    body = (
      <View style={styles.stack} testID="curriculum-skeleton">
        <Skeleton height={20} width="60%" />
        <Skeleton height={140} />
        <Skeleton height={140} />
      </View>
    );
  } else if (query.isError) {
    body = (
      <ErrorState
        error={query.error}
        title={t('loadFailed')}
        onRetry={() => void query.refetch()}
      />
    );
  } else if (detail) {
    body = <CurriculumContent detail={detail} />;
  }

  if (isWide) {
    // PC: one centered column under a page header (the editor itself is a single list).
    return (
      <WorkShell maxWidth={CURRICULUM_MAX_WIDTH} testID="curriculum-desktop">
        <WorkHeader title={t('curriculum.title')} hasBack />
        {body}
      </WorkShell>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('curriculum.title')} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.huge }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {body}
      </ScrollView>
    </View>
  );
}

const CURRICULUM_MAX_WIDTH = 900;

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  content: { paddingHorizontal: layout.screenPaddingX, paddingTop: spacing.md },
  stack: { gap: spacing.lg },
}));
