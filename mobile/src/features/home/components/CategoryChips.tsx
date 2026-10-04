import Feather from '@expo/vector-icons/Feather';
import { memo, useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { getCategoryColor, toFeatherIcon } from '@/features/search/categoryIcon';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { CategoryDto } from '@/types/api';

const MAX_CATEGORIES = 8;

type CategoryChipsProps = {
  categories: readonly CategoryDto[];
  /** Keep stable (`useCallback`): the chips are memoized. */
  onPressCategory: (category: CategoryDto) => void;
  /** "All topics" chip at the end of the row: opens the Search tab. */
  onPressAll: () => void;
};

type CategoryChipProps = { category: CategoryDto; onPress: (category: CategoryDto) => void };

/** Pill with the category icon in its own color + the name (48 dp high). */
const CategoryChip = memo(function CategoryChip({ category, onPress }: CategoryChipProps) {
  const { t } = useTranslation('home');
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      onPress={() => onPress(category)}
      accessibilityRole="button"
      accessibilityLabel={t('categories.label', {
        name: category.name,
        count: category.courseCount,
      })}
      style={({ pressed }) => [styles.chip, pressed ? styles.pressed : null]}
    >
      <Feather
        name={toFeatherIcon(category.icon)}
        size={18}
        color={getCategoryColor(category, colors.primaryText)}
      />
      <AppText variant="label" family="bodyMedium" numberOfLines={1}>
        {category.name}
      </AppText>
    </Pressable>
  );
});

function AllChip({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation('home');
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('categories.all')}
      style={({ pressed }) => [styles.chip, styles.allChip, pressed ? styles.pressed : null]}
    >
      <AppText variant="label" family="bodyMedium" color="primaryText" numberOfLines={1}>
        {t('categories.all')}
      </AppText>
      <Feather name="arrow-right" size={16} color={colors.primaryText} />
    </Pressable>
  );
}

function Separator() {
  return <View style={rail.separator} />;
}

function keyExtractor(category: CategoryDto): string {
  return category.id;
}

/** Horizontal row of category chips (concept B "topics"); the last chip leads to Search. */
export function CategoryChips({ categories, onPressCategory, onPressAll }: CategoryChipsProps) {
  const { t } = useTranslation('home');
  const renderItem = useCallback(
    ({ item }: { item: CategoryDto }) => <CategoryChip category={item} onPress={onPressCategory} />,
    [onPressCategory],
  );
  const renderFooter = useCallback(
    () => (
      <View style={rail.footer}>
        <AllChip onPress={onPressAll} />
      </View>
    ),
    [onPressAll],
  );
  return (
    <FlatList
      horizontal
      data={categories.slice(0, MAX_CATEGORIES)}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ItemSeparatorComponent={Separator}
      ListFooterComponent={renderFooter}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={rail.content}
      accessibilityLabel={t('categories.title')}
    />
  );
}

const useStyles = makeStyles((t) => ({
  chip: {
    minHeight: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  allChip: { borderColor: t.colors.primaryText, backgroundColor: t.colors.primarySoft },
  pressed: { opacity: 0.7 },
}));

const rail = StyleSheet.create({
  content: { paddingHorizontal: layout.screenPaddingX },
  separator: { width: spacing.sm + 2 },
  footer: { marginLeft: spacing.sm + 2 },
});
