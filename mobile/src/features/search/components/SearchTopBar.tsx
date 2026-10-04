import Feather from '@expo/vector-icons/Feather';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Badge, SearchBar } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, spacing, useTheme } from '@/theme';

type SearchTopBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: (text: string) => void;
  /** Number of active filters (badge on the Filter button). */
  filterCount: number;
  onPressFilter: () => void;
};

/** Serif title, the search pill and a round Filter button with an active-count badge (SC-05/06). */
export function SearchTopBar({
  value,
  onChangeText,
  onSubmit,
  filterCount,
  onPressFilter,
}: SearchTopBarProps) {
  const { t } = useTranslation('search');
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const isActive = filterCount > 0;
  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <AppText variant="h1" accessibilityRole="header">
        {t('title')}
      </AppText>
      <View style={styles.row}>
        <SearchBar
          value={value}
          onChangeText={onChangeText}
          onSubmit={onSubmit}
          style={styles.search}
        />
        <View>
          <Pressable
            onPress={onPressFilter}
            accessibilityRole="button"
            accessibilityLabel={
              isActive ? t('filter.buttonActive', { active: filterCount }) : t('filter.button')
            }
            style={({ pressed }) => [
              styles.filter,
              isActive ? styles.filterActive : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <Feather name="sliders" size={20} color={isActive ? colors.primaryText : colors.text} />
          </Pressable>
          {isActive ? (
            <View
              style={styles.badge}
              pointerEvents="none"
              importantForAccessibility="no-hide-descendants"
            >
              <Badge count={filterCount} />
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    gap: spacing.md,
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: spacing.lg,
    backgroundColor: t.colors.background,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  search: { flex: 1 },
  filter: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: layout.minTouchTarget / 2,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  filterActive: { borderColor: t.colors.primaryText, backgroundColor: t.colors.primarySoft },
  pressed: { opacity: 0.7 },
  badge: { position: 'absolute', top: -4, right: -4 },
}));
