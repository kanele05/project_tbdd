import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DialogFrame } from '@/components/layout/DialogFrame';
import { AppText, Button, CinematicHeader, GlassIconButton } from '@/components/ui';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslation } from '@/i18n';
import {
  INITIAL_SEARCH_FILTERS,
  useSearchFilterStore,
  type PriceType,
  type SearchFilterValues,
} from '@/stores/searchFilterStore';
import { layout, makeStyles, spacing } from '@/theme';
import type { CourseSort } from '@/types/api';
import { confirmAction } from '@/utils/confirmAction';

import { FilterForm } from '../components/FilterForm';
import {
  centsToDollars,
  dollarsToCents,
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
  const { t } = useTranslation(['search', 'common']);
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { isWide } = useBreakpoint();
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
    // `Alert.alert` does nothing on the web: confirmAction uses a browser dialog there.
    void confirmAction({
      title: t('filter.discardTitle'),
      message: t('filter.discardMessage'),
      confirmLabel: t('filter.discard'),
      cancelLabel: t('filter.keepEditing'),
      isDestructive: true,
    }).then((isConfirmed) => {
      if (isConfirmed) closeModal();
    });
  }, [hasChanges, t]);
  const handleApply = useCallback(() => {
    applyFilters(values);
    closeModal();
  }, [applyFilters, values]);

  const applyLabel =
    total == null || hasRangeError ? t('filter.apply') : t('filter.applyCount', { count: total });

  const form = (
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
  );

  if (isWide) {
    return (
      <DialogFrame
        title={t('filter.title')}
        closeLabel={t('common:actions.close')}
        onClose={handleClose}
        width={600}
        headerRight={
          <Button
            title={t('filter.reset')}
            accessibilityLabel={t('filter.resetLabel')}
            variant="ghost"
            size="sm"
            disabled={isDefault}
            onPress={handleReset}
            testID="filter-reset"
          />
        }
        footer={
          <Button
            title={applyLabel}
            onPress={handleApply}
            disabled={hasRangeError}
            fullWidth
            testID="filter-apply"
          />
        }
        testID="search-filter-dialog"
      >
        {form}
      </DialogFrame>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <CinematicHeader
        title={t('filter.title')}
        posterIndex={1}
        showBack={false}
        right={
          <>
            <Pressable
              onPress={handleReset}
              disabled={isDefault}
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={t('filter.resetLabel')}
              accessibilityState={{ disabled: isDefault }}
              style={styles.reset}
            >
              <AppText variant="label" color="white" style={isDefault ? styles.dimmed : null}>
                {t('filter.reset')}
              </AppText>
            </Pressable>
            <GlassIconButton
              icon="x"
              onPress={handleClose}
              accessibilityLabel={t('common:actions.close')}
            />
          </>
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {form}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <Button title={applyLabel} onPress={handleApply} disabled={hasRangeError} fullWidth />
      </View>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  reset: {
    minWidth: layout.minTouchTarget,
    minHeight: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  dimmed: { opacity: 0.4 },
  content: { padding: layout.screenPaddingX, paddingBottom: spacing.xxl },
  footer: {
    paddingTop: spacing.md,
    paddingHorizontal: layout.screenPaddingX,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
    backgroundColor: t.colors.background,
  },
}));
