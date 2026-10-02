import Feather from '@expo/vector-icons/Feather';
import { memo } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { CategoryDto } from '@/types/api';

import { getCategoryColor, toFeatherIcon } from '../categoryIcon';

type CategoryRowProps = {
  category: CategoryDto;
  onPress: (category: CategoryDto) => void;
};

/** One row of the Search "Categories" list: colored icon, name, chevron (SC-05). */
function CategoryRowBase({ category, onPress }: CategoryRowProps) {
  return (
    <Pressable
      onPress={() => onPress(category)}
      accessibilityRole="button"
      accessibilityLabel={`${category.name}, ${category.courseCount} courses`}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
    >
      <Feather name={toFeatherIcon(category.icon)} size={24} color={getCategoryColor(category)} />
      <AppText variant="body" color="textSecondary" style={styles.name} numberOfLines={1}>
        {category.name}
      </AppText>
      <Feather name="chevron-right" size={20} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    backgroundColor: colors.background,
  },
  pressed: { backgroundColor: colors.backgroundAlt },
  name: { flex: 1 },
});

export const CategoryRow = memo(CategoryRowBase);
