import { router } from 'expo-router';
import { useCallback, useMemo, type ReactNode } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { useTabBarClearance } from '@/components/FloatingTabBar';
import { AppText } from '@/components/ui/AppText';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { AdminStatsDto } from '@/types/api';
import { formatPrice } from '@/utils/formatPrice';

import { COURSE_STATUS_ORDER, ROLE_ORDER } from '../adminMeta';
import { AdminErrorState } from '../components/AdminErrorState';
import { DistributionBar, type DistributionItem } from '../components/DistributionBar';
import { KpiTile } from '../components/KpiTile';
import { PendingCard } from '../components/PendingCard';
import { QuickLink } from '../components/QuickLink';
import { TopCoursesList } from '../components/TopCoursesList';
import { useAdminStats } from '../hooks';

const openQueue = (): void => router.push('/admin/courses');
const openUsers = (): void => router.push('/admin/users');
const openCourse = (courseId: string): void => router.push(`/admin/courses/${courseId}`);

function DashboardSkeleton() {
  const styles = useStyles();
  return (
    <View style={styles.section} testID="admin-dashboard-skeleton">
      <Skeleton height={96} borderRadius={radius.card} />
      <View style={styles.grid}>
        <Skeleton height={112} borderRadius={radius.card} style={styles.skeletonTile} />
        <Skeleton height={112} borderRadius={radius.card} style={styles.skeletonTile} />
        <Skeleton height={112} borderRadius={radius.card} style={styles.skeletonTile} />
        <Skeleton height={112} borderRadius={radius.card} style={styles.skeletonTile} />
      </View>
      <Skeleton height={140} borderRadius={radius.card} />
    </View>
  );
}

function DashboardBody({ stats }: { stats: AdminStatsDto }) {
  const { t } = useTranslation('admin');
  const { colors } = useTheme();
  const styles = useStyles();

  const roleItems = useMemo<DistributionItem[]>(() => {
    const roleColors = { STUDENT: colors.primary, TEACHER: colors.secondary, ADMIN: colors.gold };
    return ROLE_ORDER.map((role) => ({
      key: role,
      label: t(`roles.${role}`),
      value: stats.users.byRole[role] ?? 0,
      color: roleColors[role],
    }));
  }, [stats.users.byRole, colors, t]);

  const statusItems = useMemo<DistributionItem[]>(() => {
    const statusColors = {
      PUBLISHED: colors.success,
      PENDING_REVIEW: colors.gold,
      DRAFT: colors.iconMuted,
      REJECTED: colors.danger,
      ARCHIVED: colors.secondary,
    };
    return COURSE_STATUS_ORDER.map((status) => ({
      key: status,
      label: t(`status.${status}`),
      value: stats.courses.byStatus[status] ?? 0,
      color: statusColors[status],
    }));
  }, [stats.courses.byStatus, colors, t]);

  return (
    <View style={styles.section}>
      <PendingCard
        total={stats.pending.total}
        courses={stats.pending.courses}
        revisions={stats.pending.revisions}
        onPress={openQueue}
      />

      <View style={styles.grid}>
        <KpiTile
          icon="users"
          label={t('dashboard.kpi.users')}
          value={String(stats.users.total)}
          hint={t('dashboard.kpi.disabled', { count: stats.users.disabledCount })}
        />
        <KpiTile
          icon="user-plus"
          label={t('dashboard.kpi.newUsers7')}
          value={String(stats.users.newLast7d)}
          hint={t('dashboard.kpi.newUsers30', { count: stats.users.newLast30d })}
        />
        <KpiTile
          icon="dollar-sign"
          label={t('dashboard.kpi.revenue')}
          value={formatPrice(stats.orders.revenueCents)}
        />
        <KpiTile
          icon="shopping-bag"
          label={t('dashboard.kpi.orders')}
          value={String(stats.orders.paidCount)}
        />
      </View>

      <DistributionBar
        title={t('dashboard.usersByRole')}
        items={roleItems}
        testID="users-by-role"
      />
      <DistributionBar
        title={t('dashboard.coursesByStatus')}
        items={statusItems}
        testID="courses-by-status"
      />

      <View style={styles.block}>
        <AppText variant="h3" accessibilityRole="header">
          {t('dashboard.topCourses')}
        </AppText>
        {stats.topCourses.length === 0 ? (
          <AppText variant="body" color="textSecondary">
            {t('dashboard.noTopCourses')}
          </AppText>
        ) : (
          <TopCoursesList courses={stats.topCourses} onPressCourse={openCourse} />
        )}
      </View>

      <View style={styles.block}>
        <QuickLink
          icon="check-square"
          title={t('dashboard.linkCourses')}
          subtitle={t('dashboard.linkCoursesHint')}
          onPress={openQueue}
          testID="link-courses"
        />
        <QuickLink
          icon="users"
          title={t('dashboard.linkUsers')}
          subtitle={t('dashboard.linkUsersHint')}
          onPress={openUsers}
          testID="link-users"
        />
      </View>
    </View>
  );
}

/** SC-31 Admin dashboard (FR-53): pending reviews, KPIs, distributions, top courses and shortcuts. */
export function AdminDashboardScreen() {
  const { t } = useTranslation('admin');
  const styles = useStyles();
  const clearance = useTabBarClearance();
  const { data, error, isPending, isError, isRefetching, refetch } = useAdminStats();
  const handleRefresh = useCallback(() => void refetch(), [refetch]);

  let body: ReactNode = null;
  if (isPending) body = <DashboardSkeleton />;
  else if (isError && !data) {
    body = (
      <AdminErrorState error={error} title={t('dashboard.loadFailed')} onRetry={handleRefresh} />
    );
  } else if (data) body = <DashboardBody stats={data} />;

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('title')} showBack={false} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: clearance }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {body}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  section: {
    gap: spacing.lg,
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing.sm,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  skeletonTile: { flexGrow: 1, flexBasis: '45%' },
  block: { gap: spacing.md },
}));
