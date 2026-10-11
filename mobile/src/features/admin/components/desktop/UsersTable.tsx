import { useMemo } from 'react';

import { TableCard, TableHeaderRow, type TableColumn } from '@/components/layout/work';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslation } from '@/i18n';
import type { AdminUserDto } from '@/types/api';

import { UserTableRow, type UserColumns } from './UserTableRow';

export type UsersTableProps = {
  users: readonly AdminUserDto[];
  /** The user whose enable request is in flight. */
  busyId?: string;
  /** Keep these callbacks stable (`useCallback`) so the memoized rows can skip re-renders. */
  onDisable: (user: AdminUserDto) => void;
  onEnable: (user: AdminUserDto) => void;
};

/** Accounts as a table with column headers (SC-34, PC). */
export function UsersTable({ users, busyId, onDisable, onEnable }: UsersTableProps) {
  const { t } = useTranslation('admin');
  const { isDesktop } = useBreakpoint();
  const columns = useMemo<UserColumns>(
    () => ({
      user: { key: 'user', label: t('users.columns.user'), flex: 2.6 },
      role: { key: 'role', label: t('users.columns.role'), width: 110 },
      usage: { key: 'usage', label: t('users.columns.usage'), flex: 1.2 },
      joined: isDesktop
        ? { key: 'joined', label: t('users.columns.joined'), width: 130 }
        : undefined,
      status: { key: 'status', label: t('users.columns.status'), width: 150 },
      actions: { key: 'actions', label: t('users.columns.actions'), width: 130 },
    }),
    [isDesktop, t],
  );
  const headerColumns = useMemo(
    () => Object.values(columns).filter((column): column is TableColumn => column !== undefined),
    [columns],
  );
  return (
    <TableCard testID="users-table">
      <TableHeaderRow columns={headerColumns} />
      {users.map((user, index) => (
        <UserTableRow
          key={user.id}
          user={user}
          columns={columns}
          isLast={index === users.length - 1}
          isBusy={busyId === user.id}
          onDisable={onDisable}
          onEnable={onEnable}
        />
      ))}
    </TableCard>
  );
}
