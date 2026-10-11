import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { ErrorState } from '@/components/ui/ErrorState';
import type { FeatherIconName } from '@/components/ui/icons';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { FormError } from '@/features/auth/components/FormError';
import { isOfflineWithoutData, OFFLINE_QUERY_ERROR } from '@/features/learning/queryStatus';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { StudioCourseDetailDto } from '@/types/api';
import { formatPriceOrFree } from '@/utils/formatPrice';

import { ModerationTimeline } from '../components/ModerationTimeline';
import { Notice } from '../components/Notice';
import { RevisionSection } from '../components/RevisionSection';
import { StatusActionsSection } from '../components/StatusActionsSection';
import { StatusChip } from '../components/StatusChip';
import { useStudioCourse } from '../hooks';
import { useCourseStatusActions } from '../useCourseStatusActions';

type LinkPath =
  | '/studio/[id]/edit'
  | '/studio/[id]/curriculum'
  | '/studio/[id]/stats'
  | '/studio/[id]/submissions';

function QuickLink({
  icon,
  label,
  path,
  courseId,
}: {
  icon: FeatherIconName;
  label: string;
  path: LinkPath;
  courseId: string;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      onPress={() => router.push({ pathname: path, params: { id: courseId } })}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.link, pressed ? styles.pressed : null]}
      testID={`status-link-${path.split('/').pop()}`}
    >
      <Feather name={icon} size={20} color={colors.primaryText} />
      <AppText variant="body" family="bodyMedium" style={styles.linkText}>
        {label}
      </AppText>
      <Feather name="chevron-right" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

function StatusContent({ detail }: { detail: StudioCourseDetailDto }) {
  const { t } = useTranslation('studio');
  const styles = useStyles();
  const actions = useCourseStatusActions(detail);
  const missing = actions.missingFromError ?? detail.missing;
  const showStats = detail.publishedAt !== null || detail.enrollmentCount > 0;
  return (
    <View style={styles.stack}>
      <View style={styles.hero}>
        <View style={styles.thumb}>
          {detail.thumbnailUrl ? (
            <Image
              source={{ uri: detail.thumbnailUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              cachePolicy="memory-disk"
              accessibilityIgnoresInvertColors
            />
          ) : null}
        </View>
        <View style={styles.heroText}>
          <AppText variant="h3" numberOfLines={3}>
            {detail.title}
          </AppText>
          <View style={styles.chips}>
            <StatusChip status={detail.status} />
            {detail.revision ? <StatusChip revision={detail.revision.status} /> : null}
          </View>
          <AppText variant="caption">
            {formatPriceOrFree(detail.priceCents)} ·{' '}
            {t('card.students', { count: detail.enrollmentCount })}
          </AppText>
        </View>
      </View>
      {detail.status === 'REJECTED' && detail.rejectionReason ? (
        <Notice
          tone="danger"
          title={t('status.rejectedTitle')}
          message={detail.rejectionReason}
          testID="status-rejection"
        />
      ) : null}
      <FormError message={actions.error} />
      <StatusActionsSection detail={detail} actions={actions} missing={missing} />
      {detail.status === 'PUBLISHED' ? <RevisionSection detail={detail} actions={actions} /> : null}
      <View style={styles.links}>
        <QuickLink
          icon="edit-2"
          label={t('status.links.edit')}
          path="/studio/[id]/edit"
          courseId={detail.id}
        />
        <QuickLink
          icon="list"
          label={t('status.links.curriculum')}
          path="/studio/[id]/curriculum"
          courseId={detail.id}
        />
        {showStats ? (
          <>
            <QuickLink
              icon="bar-chart-2"
              label={t('status.links.stats')}
              path="/studio/[id]/stats"
              courseId={detail.id}
            />
            <QuickLink
              icon="inbox"
              label={t('status.links.submissions')}
              path="/studio/[id]/submissions"
              courseId={detail.id}
            />
          </>
        ) : null}
      </View>
      <View style={styles.history}>
        <AppText variant="h3" accessibilityRole="header">
          {t('history.title')}
        </AppText>
        <ModerationTimeline entries={detail.moderation} />
      </View>
    </View>
  );
}

/**
 * SC-26 Course status (FR-41 / FR-42 / FR-43): where the course is in its life cycle, what is
 * missing before it can be submitted, the buttons that move it forward (submit, withdraw, hide,
 * restore, delete), the revision of a published course, links to the editors / stats / project
 * submissions, and the review history with the admin's reasons.
 */
export function CourseStatusScreen({ courseId }: { courseId: string }) {
  const { t } = useTranslation('studio');
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const query = useStudioCourse(courseId);

  let body;
  if (isOfflineWithoutData(query)) {
    body = <ErrorState error={OFFLINE_QUERY_ERROR} onRetry={() => void query.refetch()} />;
  } else if (query.isPending) {
    body = (
      <View style={styles.stack} testID="status-skeleton">
        <Skeleton height={88} />
        <Skeleton height={120} />
        <Skeleton height={52} />
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
  } else {
    body = <StatusContent detail={query.data} />;
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('status.title')} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.huge }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching && !query.isPending}
            onRefresh={() => void query.refetch()}
          />
        }
      >
        {body}
      </ScrollView>
    </View>
  );
}

const THUMB = 88;

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  content: { paddingHorizontal: layout.screenPaddingX, paddingTop: spacing.md },
  stack: { gap: spacing.xl },
  hero: { flexDirection: 'row', gap: spacing.md },
  thumb: {
    width: THUMB,
    height: THUMB,
    overflow: 'hidden',
    borderRadius: radius.button,
    backgroundColor: t.colors.surface,
  },
  heroText: { flex: 1, gap: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  links: { gap: spacing.sm },
  link: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
  },
  pressed: { backgroundColor: t.colors.surfaceAlt },
  linkText: { flex: 1 },
  history: { gap: spacing.md },
}));
