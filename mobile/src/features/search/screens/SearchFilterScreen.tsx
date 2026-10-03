import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, IconButton } from '@/components/ui';
import { STRINGS } from '@/constants/strings';
import {
  INITIAL_SEARCH_FILTERS,
  useSearchFilterStore,
  type PriceType,
  type SearchFilterValues,
} from '@/stores/searchFilterStore';
import { colors, layout, spacing } from '@/theme';
import type { CourseSort } from '@/types/api';

import { FilterForm } from '../components/FilterForm';
import {
  centsToDollars,
  dollarsToCents,
  formatApplyLabel,
  hasPriceRangeError,
  isSameFilters,
  sanitizeMoneyInput,
} from '../filterUtils';
import {
  buildSearchParams,
  useAppliedFilters,
  useDebouncedValue,
  useFilterResultCount,
} from '../hooks';

const COUNT_DEBOUNCE_MS = 300;

function closeModal(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/**
 * SC-07 Filter (modal). Edits a local draft; "Apply" writes it to `searchFilterStore` and closes,
 * "Reset" clears the draft, closing with unsaved changes asks for confirmation.
 */
export function SearchFilterScreen() {
  const insets = useSafeAreaInsets();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const applied = useAppliedFilters();
  const applyFilters = useSearchFilterStore((state) => state.apply);

  const [draft, setDraft] = useState<SearchFilterValues>(applied);
  const [minText, setMinText] = useState(centsToDollars(applied.minPriceCents));
  const [maxText, setMaxText] = useState(centsToDollars(applied.maxPriceCents));

  const values = useMemo<SearchFilterValues>(
    () => ({
      ...draft,
      minPriceCents: draft.price === 'paid' ? dollarsToCents(minText) : null,
      maxPriceCents: draft.price === 'paid' ? dollarsToCents(maxText) : null,
    }),
    [draft, minText, maxText],
  );
  const hasRangeError = hasPriceRangeError(values);
  const hasChanges = !isSameFilters(values, applied);
  const isDefault = isSameFilters(values, INITIAL_SEARCH_FILTERS);

  // "Apply (n results)": count with the same keyword the Search screen is using.
  const countParams = useMemo(() => buildSearchParams(q ?? '', values), [q, values]);
  const debouncedParams = useDebouncedValue(countParams, COUNT_DEBOUNCE_MS);
  const { data: total } = useFilterResultCount(debouncedParams, { enabled: !hasRangeError });

  const handleToggleCategory = useCallback((categoryId: string) => {
    setDraft((current) => ({
      ...current,
      categoryIds: current.categoryIds.includes(categoryId)
        ? current.categoryIds.filter((id) => id !== categoryId)
        : [...current.categoryIds, categoryId],
    }));
  }, []);
  const handleChangePrice = useCallback(
    (price: PriceType) => setDraft((current) => ({ ...current, price })),
    [],
  );
  const handleChangeRating = useCallback(
    (minRating: number | null) => setDraft((current) => ({ ...current, minRating })),
    [],
  );
  const handleChangeSort = useCallback(
    (sort: CourseSort) => setDraft((current) => ({ ...current, sort })),
    [],
  );
  const handleChangeMin = useCallback((text: string) => setMinText(sanitizeMoneyInput(text)), []);
  const handleChangeMax = useCallback((text: string) => setMaxText(sanitizeMoneyInput(text)), []);

  const handleReset = useCallback(() => {
    setDraft({ ...INITIAL_SEARCH_FILTERS });
    setMinText('');
    setMaxText('');
  }, []);
  const handleClose = useCallback(() => {
    if (!hasChanges) {
      closeModal();
      return;
    }
    Alert.alert('Discard changes?', 'Your filter changes have not been applied.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: closeModal },
    ]);
  }, [hasChanges]);
  const handleApply = useCallback(() => {
    applyFilters(values);
    closeModal();
  }, [applyFilters, values]);

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <IconButton icon="x" onPress={handleClose} accessibilityLabel={STRINGS.common.close} />
          <AppText variant="h3" align="center" accessibilityRole="header" style={styles.title}>
            Filter
          </AppText>
          <Pressable
            onPress={handleReset}
            disabled={isDefault}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Reset filters"
            accessibilityState={{ disabled: isDefault }}
            style={styles.reset}
          >
            <AppText variant="label" color="primaryText" style={isDefault ? styles.dimmed : null}>
              Reset
            </AppText>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <FilterForm
          draft={values}
          minText={minText}
          maxText={maxText}
          hasRangeError={hasRangeError}
          onToggleCategory={handleToggleCategory}
          onChangePrice={handleChangePrice}
          onChangeMin={handleChangeMin}
          onChangeMax={handleChangeMax}
          onChangeRating={handleChangeRating}
          onChangeSort={handleChangeSort}
        />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <Button
          title={formatApplyLabel(hasRangeError ? undefined : total)}
          onPress={handleApply}
          disabled={hasRangeError}
          fullWidth
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.xs, backgroundColor: colors.background },
  headerRow: { height: layout.headerHeight, flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1 },
  reset: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: spacing.md,
  },
  dimmed: { opacity: 0.4 },
  content: { padding: layout.screenPaddingX, paddingBottom: spacing.xxl },
  footer: {
    paddingTop: spacing.md,
    paddingHorizontal: layout.screenPaddingX,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});
