import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SearchBar } from '@/components/ui/SearchBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { showToast } from '@/components/ui/Toast';
import { useDebouncedValue } from '@/features/search/hooks';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { AdminUserDto, AdminUserListParams, Role } from '@/types/api';
import { confirmAction } from '@/utils/confirmAction';

import { getAdminErrorMessage } from '../adminErrors';
import { ADMIN_PAGE_SIZE, ROLE_ORDER } from '../adminMeta';
import { AdminErrorState } from '../components/AdminErrorState';
import { ReasonModal } from '../components/ReasonModal';
import { UserRow } from '../components/UserRow';
import { useAdminUsers, useDisableUser, useEnableUser } from '../hooks';
import { requiredReasonSchema } from '../schemas';

type RoleFilter = Role | 'all';
type StatusFilter = 'all' | 'active' | 'disabled';

const SEARCH_DEBOUNCE_MS = 400;
const STATUS_FILTERS: readonly StatusFilter[] = ['all', 'active', 'disabled'];
const ROLE_FILTERS: readonly RoleFilter[] = ['all', ...ROLE_ORDER];
const SKELETON_KEYS = [0, 1, 2, 3, 4] as const;
const keyExtractor = (item: AdminUserDto): string => item.id;

function UsersSkeleton() {
  const styles = useStyles();
  return (
    <View testID="users-skeleton">
      {SKELETON_KEYS.map((key) => (
        <Skeleton key={key} height={132} borderRadius={radius.card} style={styles.skeleton} />
      ))}
    </View>
  );
}

/**
 * SC-34 Users (FR-52): debounced search, role and status filters, and disable (with a reason) /
 * enable. Admin accounts have no action (BR-28); the server still guards with `CANNOT_DISABLE_ADMIN`.
 */
export function AdminUsersScreen() {
  const { t } = useTranslation('admin');
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
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

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<AdminUserDto>) => (
      <UserRow
        user={item}
        isBusy={busyId === item.id}
        onDisable={handleDisable}
        onEnable={(user) => void handleEnable(user)}
      />
    ),
    [busyId, handleDisable, handleEnable],
  );
  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  const handleRefresh = useCallback(() => void refetch(), [refetch]);

  let body: ReactNode;
  if (query.isPending) {
    body = <UsersSkeleton />;
  } else if (query.isError && users.length === 0) {
    body = (
      <AdminErrorState error={query.error} title={t('users.loadFailed')} onRetry={handleRefresh} />
    );
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
        ListEmptyComponent={
          <EmptyState
            icon="users"
            title={t('users.emptyTitle')}
            message={t('users.emptyMessage')}
          />
        }
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
      <View style={styles.filters}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={t('users.searchPlaceholder')}
        />
        <View
          style={styles.chips}
          accessibilityRole="radiogroup"
          accessibilityLabel={t('users.roleFilter')}
        >
          {ROLE_FILTERS.map((key) => (
            <Chip
              key={key}
              label={key === 'all' ? t('users.all') : t(`roles.${key}`)}
              size="sm"
              selected={role === key}
              onPress={() => setRole(key)}
              testID={`role-${key}`}
            />
          ))}
        </View>
        <View
          style={styles.chips}
          accessibilityRole="radiogroup"
          accessibilityLabel={t('users.statusFilter')}
        >
          {STATUS_FILTERS.map((key) => (
            <Chip
              key={key}
              label={t(`users.status.${key}`)}
              size="sm"
              selected={status === key}
              onPress={() => setStatus(key)}
              testID={`status-${key}`}
            />
          ))}
        </View>
      </View>
      {body}
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
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  filters: { gap: spacing.sm, paddingHorizontal: layout.screenPaddingX, paddingTop: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  skeleton: { marginHorizontal: layout.screenPaddingX, marginTop: spacing.md },
  footer: { paddingVertical: spacing.lg },
}));
