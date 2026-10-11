import { View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { SearchBar } from '@/components/ui/SearchBar';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, spacing } from '@/theme';
import type { Role } from '@/types/api';

import { ROLE_ORDER } from '../adminMeta';

export type RoleFilter = Role | 'all';
export type StatusFilter = 'all' | 'active' | 'disabled';

const STATUS_FILTERS: readonly StatusFilter[] = ['all', 'active', 'disabled'];
const ROLE_FILTERS: readonly RoleFilter[] = ['all', ...ROLE_ORDER];

export type UserFiltersProps = {
  search: string;
  onSearchChange: (text: string) => void;
  role: RoleFilter;
  onRoleChange: (role: RoleFilter) => void;
  status: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  /** `toolbar` = one wrapping row for the PC layout; default stacks the controls (phone). */
  isToolbar?: boolean;
};

/** Search box + role chips + status chips of the users screen (SC-34). */
export function UserFilters({
  search,
  onSearchChange,
  role,
  onRoleChange,
  status,
  onStatusChange,
  isToolbar = false,
}: UserFiltersProps) {
  const { t } = useTranslation('admin');
  const styles = useStyles();
  return (
    <View style={isToolbar ? styles.toolbar : styles.filters}>
      <SearchBar
        value={search}
        onChangeText={onSearchChange}
        placeholder={t('users.searchPlaceholder')}
        style={isToolbar ? styles.search : undefined}
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
            onPress={() => onRoleChange(key)}
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
            onPress={() => onStatusChange(key)}
            testID={`status-${key}`}
          />
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  filters: { gap: spacing.sm, paddingHorizontal: layout.screenPaddingX, paddingTop: spacing.xs },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  search: { width: 320 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
}));
