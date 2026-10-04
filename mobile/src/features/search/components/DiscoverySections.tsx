import { useCallback, useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, SectionHeader, Skeleton } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { getErrorMessage } from '@/lib/appError';
import { layout, makeStyles, radius, spacing } from '@/theme';
import type { CategoryDto, TagDto } from '@/types/api';

import { useCategories, useHotTags } from '../hooks';
import { openCourseList } from '../navigation';
import { useRecentSearches } from '../recentSearches';
import { CategoryRow } from './CategoryRow';
import { HotTopics } from './HotTopics';
import { InlineError } from './InlineError';
import { RecentSearches } from './RecentSearches';

/** How many recent searches the discovery screen lists (the history keeps up to 10). */
const MAX_SHOWN_RECENT = 5;

type SectionProps = {
  title: string;
  onViewMore?: () => void;
  /** Replaces "View more" in the header (e.g. "Clear all"). */
  action?: ReactNode;
  children: ReactNode;
};

/** Serif title (+ link or action) and the content, both on the 20 dp screen gutters. */
export function DiscoverySection({ title, onViewMore, action, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.padded}>
        {action ? (
          <View style={styles.titleRow}>
            <AppText variant="h2" accessibilityRole="header" style={styles.flex}>
              {title}
            </AppText>
            {action}
          </View>
        ) : (
          <SectionHeader title={title} onViewMore={onViewMore} />
        )}
      </View>
      <View style={styles.padded}>{children}</View>
    </View>
  );
}

/** Recent searches with "Clear all"; renders nothing while the history is empty. */
export function RecentSection({ onPressKeyword }: { onPressKeyword: (keyword: string) => void }) {
  const { t } = useTranslation('search');
  const recent = useRecentSearches((state) => state.keywords);
  const hydrate = useRecentSearches((state) => state.hydrate);
  const remove = useRecentSearches((state) => state.remove);
  const clear = useRecentSearches((state) => state.clear);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (recent.length === 0) return null;
  return (
    <DiscoverySection
      title={t('recent.title')}
      action={
        <Pressable
          onPress={clear}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={t('recent.clearLabel')}
          style={styles.clear}
        >
          <AppText variant="caption" family="bodySemiBold" color="primaryText">
            {t('recent.clear')}
          </AppText>
        </Pressable>
      }
    >
      <RecentSearches
        keywords={recent.slice(0, MAX_SHOWN_RECENT)}
        onPressKeyword={onPressKeyword}
        onRemoveKeyword={remove}
      />
    </DiscoverySection>
  );
}

function ChipsSkeleton() {
  return (
    <View style={styles.chips}>
      {[64, 52, 96, 76, 150, 110, 112].map((width, index) => (
        <Skeleton key={index} width={width} height={40} borderRadius={radius.pill} />
      ))}
    </View>
  );
}

/** "Hot topics": chips, with a skeleton while loading and an inline error with Retry. */
export function HotTopicsSection({ onPressTag }: { onPressTag: (tag: TagDto) => void }) {
  const { t } = useTranslation('search');
  const { data, isPending, isError, error, refetch } = useHotTags();
  if (!isPending && !isError && (data?.length ?? 0) === 0) return null;
  return (
    <DiscoverySection title={t('hot.title')}>
      {isPending ? (
        <ChipsSkeleton />
      ) : isError ? (
        <InlineError message={getErrorMessage(error)} onRetry={() => void refetch()} />
      ) : (
        <HotTopics tags={data ?? []} onPressTag={onPressTag} />
      )}
    </DiscoverySection>
  );
}

/** "Categories": one grouped card of rows (icon, name, count, chevron). */
export function CategoriesSection() {
  const { t } = useTranslation('search');
  const themed = useStyles();
  const { data, isPending, isError, error, refetch } = useCategories();
  const handlePressCategory = useCallback(
    (category: CategoryDto) => openCourseList({ categoryId: category.id, title: category.name }),
    [],
  );
  return (
    <DiscoverySection title={t('categories.title')} onViewMore={() => openCourseList()}>
      {isPending ? (
        <View style={themed.group}>
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} height={52} style={styles.rowSkeleton} />
          ))}
        </View>
      ) : isError ? (
        <InlineError message={getErrorMessage(error)} onRetry={() => void refetch()} />
      ) : (
        <View style={themed.group}>
          {(data ?? []).map((category, index) => (
            <View key={category.id}>
              {index > 0 ? <View style={themed.separator} /> : null}
              <CategoryRow category={category} onPress={handlePressCategory} />
            </View>
          ))}
        </View>
      )}
    </DiscoverySection>
  );
}

const useStyles = makeStyles((t) => ({
  group: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    borderRadius: radius.card,
    backgroundColor: t.colors.card,
  },
  // Starts under the text of the row (16 dp padding + 44 dp icon + 12 dp gap + 4).
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 76, backgroundColor: t.colors.border },
}));

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  padded: { paddingHorizontal: layout.screenPaddingX },
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 32 },
  clear: { minHeight: 32, justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.sm, rowGap: spacing.sm },
  rowSkeleton: { margin: spacing.sm, width: 'auto', borderRadius: radius.button },
});
