import { router } from 'expo-router';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslation } from '@/i18n';
import { makeStyles, spacing } from '@/theme';
import type { AdminStatsDto } from '@/types/api';
import { formatPrice } from '@/utils/formatPrice';

import { useDashboardDistributions } from '../../useDashboardDistributions';
import { DistributionBar } from '../DistributionBar';
import { KpiTile } from '../KpiTile';
import { PendingCard } from '../PendingCard';
import { QuickLink } from '../QuickLink';
import { TopCoursesList } from '../TopCoursesList';

const openQueue = (): void => router.push('/admin/courses');
const openUsers = (): void => router.push('/admin/users');
const openCourse = (courseId: string): void => router.push(`/admin/courses/${courseId}`);

/**
 * SC-31 on a PC window: the pending card, the four KPI tiles in one row, the two distribution bars
 * side by side, then the top courses next to the shortcuts. On a tablet the pairs stack.
 */
export function AdminDashboardWide({ stats }: { stats: AdminStatsDto }) {
  const { t } = useTranslation('admin');
  const { isDesktop } = useBreakpoint();
  const styles = useStyles();
  const { roleItems, statusItems } = useDashboardDistributions(stats);
  const pairStyle = isDesktop ? styles.pair : styles.stack;
  const cellStyle = isDesktop ? styles.cell : null;

  return (
    <View style={styles.page} testID="admin-dashboard-desktop">
      <PendingCard
        total={stats.pending.total}
        courses={stats.pending.courses}
        revisions={stats.pending.revisions}
        onPress={openQueue}
      />

      <View style={styles.kpis}>
        <KpiTile
          icon="users"
          label={t('dashboard.kpi.users')}
          value={String(stats.users.total)}
          hint={t('dashboard.kpi.disabled', { count: stats.users.disabledCount })}
          style={styles.tile}
        />
        <KpiTile
          icon="user-plus"
          label={t('dashboard.kpi.newUsers7')}
          value={String(stats.users.newLast7d)}
          hint={t('dashboard.kpi.newUsers30', { count: stats.users.newLast30d })}
          style={styles.tile}
        />
        <KpiTile
          icon="dollar-sign"
          label={t('dashboard.kpi.revenue')}
          value={formatPrice(stats.orders.revenueCents)}
          style={styles.tile}
        />
        <KpiTile
          icon="shopping-bag"
          label={t('dashboard.kpi.orders')}
          value={String(stats.orders.paidCount)}
          style={styles.tile}
        />
      </View>

      <View style={pairStyle}>
        <View style={cellStyle}>
          <DistributionBar
            title={t('dashboard.usersByRole')}
            items={roleItems}
            testID="users-by-role"
          />
        </View>
        <View style={cellStyle}>
          <DistributionBar
            title={t('dashboard.coursesByStatus')}
            items={statusItems}
            testID="courses-by-status"
          />
        </View>
      </View>

      <View style={pairStyle}>
        <View style={[styles.block, isDesktop ? styles.wideCell : null]}>
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
        <View style={[styles.block, cellStyle]}>
          <AppText variant="h3" accessibilityRole="header">
            {t('dashboard.shortcuts')}
          </AppText>
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
    </View>
  );
}

const TILE_BASIS = 220;

const useStyles = makeStyles(() => ({
  page: { gap: spacing.xl },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  tile: { flexBasis: TILE_BASIS, flexGrow: 1, minWidth: 0 },
  pair: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xl },
  stack: { gap: spacing.xl },
  cell: { flex: 1, minWidth: 0 },
  wideCell: { flex: 2, minWidth: 0 },
  block: { gap: spacing.md },
}));
