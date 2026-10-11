import { useMemo } from 'react';

import { useTranslation } from '@/i18n';
import { useTheme } from '@/theme';
import type { AdminStatsDto } from '@/types/api';

import { COURSE_STATUS_ORDER, ROLE_ORDER } from './adminMeta';
import type { DistributionItem } from './components/DistributionBar';

/** Segments of the two stacked bars of the dashboard: users by role and courses by status. */
export function useDashboardDistributions(stats: AdminStatsDto) {
  const { t } = useTranslation('admin');
  const { colors } = useTheme();

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

  return { roleItems, statusItems };
}
