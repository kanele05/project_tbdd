import Feather from '@expo/vector-icons/Feather';
import { memo } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { AppText } from '@/components/ui';
import { getCategoryColor, toFeatherIcon } from '@/features/search/categoryIcon';
import { colors, layout, radius, spacing } from '@/theme';
import type { CategoryDto } from '@/types/api';

const COLUMNS = 2;
const GAP = spacing.md;
const MAX_CATEGORIES = 6;

type CategoryTileProps = {
  category: CategoryDto;
  width: number;
  onPress: (category: CategoryDto) => void;
};

function CategoryTileBase({ category, width, onPress }: CategoryTileProps) {
  return (
    <Pressable
      onPress={() => onPress(category)}
      accessibilityRole="button"
      accessibilityLabel={`${category.name}, ${category.courseCount} courses`}
      style={({ pressed }) => [styles.tile, { width }, pressed ? styles.pressed : null]}
    >
      <View style={[styles.iconBox, { backgroundColor: getCategoryColor(category) }]}>
        <Feather name={toFeatherIcon(category.icon)} size={20} color={colors.white} />
      </View>
      <AppText variant="body" numberOfLines={1} style={styles.name}>
        {category.name}
      </AppText>
    </Pressable>
  );
}

const CategoryTile = memo(CategoryTileBase);

export function useCategoryTileWidth(): number {
  const { width } = useWindowDimensions();
  return Math.floor((width - 2 * layout.screenPaddingX - GAP * (COLUMNS - 1)) / COLUMNS);
}

type CategoryGridProps = {
  categories: readonly CategoryDto[];
  /** Keep stable (`useCallback`): the tiles are memoized. */
  onPressCategory: (category: CategoryDto) => void;
};

/** 2-column grid of category tiles with a colored icon box (Home, SC-04). */
export function CategoryGrid({ categories, onPressCategory }: CategoryGridProps) {
  const tileWidth = useCategoryTileWidth();
  return (
    <View style={styles.grid}>
      {categories.slice(0, MAX_CATEGORIES).map((category) => (
        <CategoryTile
          key={category.id}
          category={category}
          width={tileWidth}
          onPress={onPressCategory}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    paddingHorizontal: layout.screenPaddingX,
  },
  // Design: 60 dp tile = 44 dp icon box with 8 dp around it, the 1 dp border is part of the 8.
  tile: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm - 1,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.card,
    backgroundColor: colors.background,
  },
  pressed: { backgroundColor: colors.backgroundAlt },
  iconBox: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.button,
  },
  name: { flex: 1 },
});
