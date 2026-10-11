import { useMemo } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCategories, useHotTags } from '@/features/search/hooks';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing } from '@/theme';
import type { TagDto } from '@/types/api';

import { STUDIO_LIMITS } from '../limits';

type FieldShellProps = { label: string; error?: string; helper?: string };

function Footer({ error, helper }: Pick<FieldShellProps, 'error' | 'helper'>) {
  if (error) {
    return (
      <AppText variant="caption" color="dangerText" accessibilityLiveRegion="polite">
        {error}
      </AppText>
    );
  }
  return helper ? <AppText variant="caption">{helper}</AppText> : null;
}

export type CategoryPickerProps = FieldShellProps & {
  value: string;
  onChange: (categoryId: string) => void;
  disabled?: boolean;
};

/** Single-choice category chips from `GET /categories` (loading skeleton, retry on failure). */
export function CategoryPicker({
  label,
  value,
  onChange,
  disabled = false,
  error,
  helper,
}: CategoryPickerProps) {
  const { t } = useTranslation('studio');
  const styles = useStyles();
  const categories = useCategories();
  return (
    <View style={styles.field} testID="category-picker">
      <AppText variant="label">{label}</AppText>
      {categories.isPending ? (
        <View style={styles.chips}>
          <Skeleton width={96} height={32} borderRadius={radius.pill} />
          <Skeleton width={120} height={32} borderRadius={radius.pill} />
          <Skeleton width={80} height={32} borderRadius={radius.pill} />
        </View>
      ) : categories.isError ? (
        <View style={styles.chips}>
          <AppText variant="caption" color="dangerText">
            {t('category.loadFailed')}
          </AppText>
          <Button
            title={t('retry')}
            variant="ghost"
            size="sm"
            onPress={() => void categories.refetch()}
          />
        </View>
      ) : (
        <View style={styles.chips}>
          {categories.data.map((category) => (
            <Chip
              key={category.id}
              label={category.name}
              selected={value === category.id}
              size="sm"
              onPress={disabled ? undefined : () => onChange(category.id)}
              testID={`category-${category.id}`}
            />
          ))}
        </View>
      )}
      <Footer error={error} helper={helper} />
    </View>
  );
}

export type TagPickerProps = FieldShellProps & {
  value: string[];
  onChange: (tagIds: string[]) => void;
  /** Tags the course already has (names for ids that are not in the hot list). */
  knownTags?: readonly TagDto[];
  disabled?: boolean;
};

/**
 * Up to 5 tags (FR-39) chosen from the existing tags: the hot tags (`GET /tags/hot`, the only
 * tag list the API has) plus the ones the course already carries.
 */
export function TagPicker({
  label,
  value,
  onChange,
  knownTags = [],
  disabled = false,
  error,
  helper,
}: TagPickerProps) {
  const { t } = useTranslation('studio');
  const styles = useStyles();
  const hot = useHotTags();
  const options = useMemo(() => {
    const byId = new Map<string, string>();
    for (const tag of hot.data ?? []) byId.set(tag.id, tag.name);
    for (const tag of knownTags) byId.set(tag.id, tag.name);
    for (const id of value) if (!byId.has(id)) byId.set(id, t('tags.unknown'));
    return [...byId.entries()].map(([id, name]) => ({ id, name }));
  }, [hot.data, knownTags, t, value]);

  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((item) => item !== id));
    else if (value.length < STUDIO_LIMITS.maxTags) onChange([...value, id]);
  };

  return (
    <View style={styles.field} testID="tag-picker">
      <View style={styles.labelRow}>
        <AppText variant="label">{label}</AppText>
        <AppText variant="caption">
          {t('tags.count', { count: value.length, max: STUDIO_LIMITS.maxTags })}
        </AppText>
      </View>
      {hot.isPending ? (
        <View style={styles.chips}>
          <Skeleton width={80} height={32} borderRadius={radius.pill} />
          <Skeleton width={104} height={32} borderRadius={radius.pill} />
        </View>
      ) : (
        <View style={styles.chips}>
          {options.map((option) => {
            const isSelected = value.includes(option.id);
            const isBlocked = !isSelected && value.length >= STUDIO_LIMITS.maxTags;
            return (
              <Chip
                key={option.id}
                label={option.name}
                selected={isSelected}
                size="sm"
                onPress={disabled || isBlocked ? undefined : () => toggle(option.id)}
                testID={`tag-${option.id}`}
              />
            );
          })}
          {options.length === 0 ? <AppText variant="caption">{t('tags.none')}</AppText> : null}
        </View>
      )}
      <Footer error={error} helper={helper} />
    </View>
  );
}

const useStyles = makeStyles(() => ({
  field: { gap: spacing.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
}));
