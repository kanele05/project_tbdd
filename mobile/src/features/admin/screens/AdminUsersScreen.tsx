import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TableLoadMore, WorkHeader, WorkShell } from '@/components/layout/work';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { showToast } from '@/components/ui/Toast';
import { useDebouncedValue } from '@/features/search/hooks';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { AdminUserDto, AdminUserListParams } from '@/types/api';
import { confirmAction } from '@/utils/confirmAction';

import { getAdminErrorMessage } from '../adminErrors';
import { ADMIN_PAGE_SIZE } from '../adminMeta';
import { AdminErrorState } from '../components/AdminErrorState';
import { UsersTable } from '../components/desktop/UsersTable';
import { ReasonModal } from '../components/ReasonModal';
import { UserFilters, type RoleFilter, type StatusFilter } from '../components/UserFilters';
import { UserRow } from '../components/UserRow';
import { useAdminUsers, useDisableUser, useEnableUser } from '../hooks';
import { requiredReasonSchema } from '../schemas';

const SEARCH_DEBOUNCE_MS = 400;
const SKELETON_KEYS = [0, 1, 2, 3, 4] as const;
const keyExtractor = (item: AdminUserDto): string => item.id;

function UsersSkeleton({ isFlush }: { isFlush: boolean }) {
  const styles = useStyles();
  return (
    <View testID="users-skeleton">
      {SKELETON_KEYS.map((key) => (
        <Skeleton
          key={key}
          height={isFlush ? 72 : 132}
          borderRadius={radius.card}
          style={isFlush ? styles.skeletonFlush : styles.skeleton}
        />
      ))}
    </View>
  );
}

/**
 * SC-34 Users (FR-52): debounced search, role and status filters, and disable (with a reason) /
 * enable. Admin accounts have no action (BR-28); the server still guards with `CANNOT_DISABLE_ADMIN`.
 * On a PC window the list is a table with column headers and the filters form a toolbar row.
 */
export function AdminUsersScreen() {
  const { t } = useTranslation('admin');
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { isWide } = useBreakpoint();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<RoleFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [target, setTarget] = useState<AdminUserDto | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);

  const params = useMemo<AdminUserListParams>(
    () => ({
      search: debouncedSearch || undefined,
      role: role === 'all' ? undefined : role,
      status: status === 'all' ? undefined : status,
      limit: ADMIN_PAGE_SIZE,
    }),
    [debouncedSearch, role, status],
  );
  const query = useAdminUsers(params);
  const disable = useDisableUser();
  const enable = useEnableUser();
  const { data, hasNextPage, isFetchingNextPage, isRefetching, fetchNextPage, refetch } = query;
  const users = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);
  const busyId = enable.isPending ? enable.variables : undefined;

  const handleEnable = useCallback(
    async (user: AdminUserDto) => {
      const isConfirmed = await confirmAction({
        title: t('users.enableTitle'),
        message: t('users.enableMessage', { name: user.fullName }),
        confirmLabel: t('users.enable'),
        cancelLabel: t('actions.cancel'),
      });
      if (!isConfirmed) return;
      enable.mutate(user.id, {
        onSuccess: () => showToast(t('toast.userEnabled'), { type: 'success' }),
        onError: (error) => showToast(getAdminErrorMessage(error), { type: 'error' }),
      });
    },
    [enable, t],
  );
  const handleDisable = useCallback(
    (user: AdminUserDto) => {
      disable.reset();
      setTarget(user);
    },
    [disable],
  );
  const submitDisable = useCallback(
    (reason: string) => {
      if (!target) return;
      disable.mutate(
        { userId: target.id, reason },
        {
          onSuccess: () => {
            setTarget(null);
            showToast(t('toast.userDisabled'), { type: 'success' });
          },
        },
      );
    },
    [disable, target, t],
  );
  const onEnableUser = useCallback((user: AdminUserDto) => void handleEnable(user), [handleEnable]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<AdminUserDto>) => (
      <UserRow
        user={item}
        isBusy={busyId === item.id}
        onDisable={handleDisable}
        onEnable={onEnableUser}
      />
    ),
    [busyId, handleDisable, onEnableUser],
  );
  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  const handleRefresh = useCallback(() => void refetch(), [refetch]);

  const empty = (
    <EmptyState icon="users" title={t('users.emptyTitle')} message={t('users.emptyMessage')} />
  );
  const failed = (
    <AdminErrorState error={query.error} title={t('users.loadFailed')} onRetry={handleRefresh} />
  );
  const filters = (
    <UserFilters
      search={search}
      onSearchChange={setSearch}
      role={role}
      onRoleChange={setRole}
      status={status}
      onStatusChange={setStatus}
      isToolbar={isWide}
    />
  );
  const reasonModal = (
    <ReasonModal
      isVisible={target !== null}
      title={t('users.disableTitle')}
      message={target ? t('users.disableMessage', { name: target.fullName }) : undefined}
      label={t('users.reasonLabel')}
      submitLabel={t('users.disable')}
      schema={requiredReasonSchema}
      isSubmitting={disable.isPending}
      errorMessage={disable.error ? getAdminErrorMessage(disable.error) : null}
      onSubmit={submitDisable}
      onClose={() => setTarget(null)}
    />
  );

  if (isWide) {
    let wideBody: ReactNode;
    if (query.isPending) wideBody = <UsersSkeleton isFlush />;
    else if (query.isError && users.length === 0) wideBody = failed;
    else if (users.length === 0) wideBody = empty;
    else {
      wideBody = (
        <UsersTable
          users={users}
          busyId={busyId}
          onDisable={handleDisable}
          onEnable={onEnableUser}
        />
      );
    }
    return (
      <WorkShell testID="admin-users-desktop">
        <WorkHeader title={t('users.title')} subtitle={t('users.subtitle')} hasBack />
        {filters}
        {wideBody}
        <TableLoadMore
          hasMore={Boolean(hasNextPage)}
          isLoading={isFetchingNextPage}
          onPress={handleEndReached}
        />
        {reasonModal}
      </WorkShell>
    );
  }

  let body: ReactNode;
  if (query.isPending) {
    body = <UsersSkeleton isFlush={false} />;
  } else if (query.isError && users.length === 0) {
    body = failed;
  } else {
    body = (
      <FlashList
        data={users}
        extraData={busyId}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        refreshing={isRefetching && !isFetchingNextPage}
        onRefresh={handleRefresh}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingBottom: insets.bottom + spacing.xl,
          paddingTop: spacing.md,
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={empty}
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator color={colors.primaryText} style={styles.footer} />
          ) : null
        }
      />
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('users.title')} />
      {filters}
      {body}
      {reasonModal}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  skeleton: { marginHorizontal: layout.screenPaddingX, marginTop: spacing.md },
  skeletonFlush: { marginBottom: spacing.sm },
  footer: { paddingVertical: spacing.lg },
}));
