import Feather from '@expo/vector-icons/Feather';
import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { makeStyles, spacing, useTheme, withAlpha } from '@/theme';
import type { CategoryDto } from '@/types/api';

import { getCategoryColor, toFeatherIcon } from '../categoryIcon';

type CategoryRowProps = {
  category: CategoryDto;
  onPress: (category: CategoryDto) => void;
};

const ICON_CIRCLE = 44;

/** One row of the Search "Categories" list: tinted icon circle, name + course count, chevron. */
function CategoryRowBase({ category, onPress }: CategoryRowProps) {
  const { t } = useTranslation('search');
  const { colors } = useTheme();
  const styles = useStyles();
  const color = getCategoryColor(category, colors.primaryText);
  return (
    <Pressable
      onPress={() => onPress(category)}
      accessibilityRole="button"
      accessibilityLabel={t('categories.label', {
        name: category.name,
        count: category.courseCount,
      })}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
    >
      <View style={[styles.circle, { backgroundColor: withAlpha(color, 0.16) }]}>
        <Feather name={toFeatherIcon(category.icon)} size={20} color={color} />
      </View>
      <View style={styles.texts}>
        <AppText variant="title" numberOfLines={1}>
          {category.name}
        </AppText>
        <AppText variant="caption" numberOfLines={1}>
          {t('categories.count', { count: category.courseCount })}
        </AppText>
      </View>
      <Feather name="chevron-right" size={22} color={colors.iconMuted} />
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  pressed: { backgroundColor: t.colors.surfaceAlt },
  circle: {
    width: ICON_CIRCLE,
    height: ICON_CIRCLE,
    borderRadius: ICON_CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1 },
}));

export const CategoryRow = memo(CategoryRowBase);
