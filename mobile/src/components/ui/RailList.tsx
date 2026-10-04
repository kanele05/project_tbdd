import type { ReactElement, ReactNode } from 'react';
import { FlatList, View, type StyleProp, type ViewStyle } from 'react-native';

import { layout, spacing } from '@/theme';

import { SectionHeader } from './SectionHeader';

export type RailListProps<T> = {
  /** Section title (serif). Omit for a bare horizontal list. */
  title?: string;
  /** Shows the "View more →" link in the header. */
  onViewMore?: () => void;
  viewMoreLabel?: string;
  data: readonly T[];
  renderItem: (item: T, index: number) => ReactElement;
  keyExtractor: (item: T, index: number) => string;
  /** Gap between two items. Default `layout.railGap` (14). */
  gap?: number;
  /** Shown instead of the rail when `data` is empty. */
  empty?: ReactNode;
  /** Space above the header; sections are separated by `layout.sectionGap` (32). */
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A titled horizontal rail: serif section header + a horizontally scrolling list whose first item
 * lines up with the 20 dp screen gutter and whose next item peeks in from the right (the hint that
 * it scrolls). Rails are short (<= ~12 items); for long lists use `FlashList`.
 */
export function RailList<T>({
  title,
  onViewMore,
  viewMoreLabel,
  data,
  renderItem,
  keyExtractor,
  gap = layout.railGap,
  empty,
  style,
  testID,
}: RailListProps<T>) {
  return (
    <View style={style} testID={testID}>
      {title ? (
        <SectionHeader
          title={title}
          onViewMore={onViewMore}
          viewMoreLabel={viewMoreLabel}
          style={{ paddingHorizontal: layout.screenPaddingX, marginBottom: spacing.md }}
        />
      ) : null}
      {data.length === 0 && empty ? (
        <View style={{ paddingHorizontal: layout.screenPaddingX }}>{empty}</View>
      ) : (
        <FlatList
          horizontal
          data={data}
          keyExtractor={keyExtractor}
          renderItem={({ item, index }) => renderItem(item, index)}
          ItemSeparatorComponent={() => <View style={{ width: gap }} />}
          contentContainerStyle={{ paddingHorizontal: layout.screenPaddingX }}
          showsHorizontalScrollIndicator={false}
        />
      )}
    </View>
  );
}
