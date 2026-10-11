import Feather from '@expo/vector-icons/Feather';
import { useCallback, useRef, useState, type ReactElement } from 'react';
import {
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { getRailMetrics } from '@/components/layout/pageGutter';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, spacing, useTheme, withAlpha } from '@/theme';

import { SectionHeader } from './SectionHeader';

export type HoverRailProps<T> = {
  /** Section title (serif). Omit for a bare row. */
  title?: string;
  onViewMore?: () => void;
  viewMoreLabel?: string;
  data: readonly T[];
  /** `itemWidth` is the width the row wants for one card (6 / 5 / 4 / 3 per view by window width). */
  renderItem: (item: T, index: number, itemWidth: number) => ReactElement;
  keyExtractor: (item: T, index: number) => string;
  /** Show this many more cards per view than the default (compact rows such as teachers). */
  extraColumns?: number;
  gap?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const EDGE_TOLERANCE = 4;

/**
 * Netflix-style row for wide screens: serif title, a horizontally scrolling line of cards that
 * starts on the page gutter (4 %), and left / right arrows that appear while the pointer is over
 * the row (or when an arrow has keyboard focus) and scroll by one page. The hovered card is lifted
 * above its neighbours so it can scale up. Use `RailList` on phones.
 */
export function HoverRail<T>({
  title,
  onViewMore,
  viewMoreLabel,
  data,
  renderItem,
  keyExtractor,
  extraColumns = 0,
  gap = layout.railGap,
  style,
  testID,
}: HoverRailProps<T>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles();
  const isReducedMotion = useReducedMotion();
  const { width: windowWidth } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [width, setWidth] = useState(windowWidth);
  const [contentWidth, setContentWidth] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [isRowHovered, setIsRowHovered] = useState(false);
  const [isArrowFocused, setIsArrowFocused] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const { gutter, itemWidth } = getRailMetrics(width, gap, extraColumns);
  const canScrollLeft = offsetX > EDGE_TOLERANCE;
  const canScrollRight = offsetX + width < contentWidth - EDGE_TOLERANCE;
  const areArrowsShown = isRowHovered || isArrowFocused;

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    if (next > 0) setWidth(next);
  }, []);
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setOffsetX(event.nativeEvent.contentOffset.x);
  }, []);
  const scrollByPage = useCallback(
    (direction: -1 | 1) => {
      const page = Math.max(itemWidth, width - gutter * 2);
      const target = Math.max(0, Math.min(offsetX + direction * page, contentWidth - width));
      scrollRef.current?.scrollTo({ x: target, animated: !isReducedMotion });
    },
    [contentWidth, gutter, isReducedMotion, itemWidth, offsetX, width],
  );

  const arrowStyle = (side: 'left' | 'right') => [
    styles.arrow,
    { width: gutter, [side]: 0, backgroundColor: withAlpha(colors.scrim, 0.62) },
  ];

  return (
    <View
      style={style}
      testID={testID}
      onLayout={handleLayout}
      onPointerEnter={() => setIsRowHovered(true)}
      onPointerLeave={() => setIsRowHovered(false)}
    >
      {title ? (
        <SectionHeader
          title={title}
          onViewMore={onViewMore}
          viewMoreLabel={viewMoreLabel}
          style={{ paddingHorizontal: gutter, marginBottom: spacing.xs }}
        />
      ) : null}
      <View>
        <ScrollView
          ref={scrollRef}
          testID={testID ? `${testID}-scroll` : undefined}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          onContentSizeChange={setContentWidth}
          contentContainerStyle={[styles.content, { paddingHorizontal: gutter, columnGap: gap }]}
        >
          {data.map((item, index) => (
            <View
              key={keyExtractor(item, index)}
              style={[{ width: itemWidth }, hoveredIndex === index ? styles.lifted : null]}
              onPointerEnter={() => setHoveredIndex(index)}
              onPointerLeave={() =>
                setHoveredIndex((current) => (current === index ? null : current))
              }
            >
              {renderItem(item, index, itemWidth)}
            </View>
          ))}
        </ScrollView>
        {canScrollLeft ? (
          <Pressable
            onPress={() => scrollByPage(-1)}
            onFocus={() => setIsArrowFocused(true)}
            onBlur={() => setIsArrowFocused(false)}
            accessibilityRole="button"
            accessibilityLabel={t('rail.scrollLeft')}
            testID={testID ? `${testID}-left` : undefined}
            style={[...arrowStyle('left'), areArrowsShown ? null : styles.arrowHidden]}
          >
            <Feather name="chevron-left" size={32} color={colors.white} />
          </Pressable>
        ) : null}
        {canScrollRight ? (
          <Pressable
            onPress={() => scrollByPage(1)}
            onFocus={() => setIsArrowFocused(true)}
            onBlur={() => setIsArrowFocused(false)}
            accessibilityRole="button"
            accessibilityLabel={t('rail.scrollRight')}
            testID={testID ? `${testID}-right` : undefined}
            style={[...arrowStyle('right'), areArrowsShown ? null : styles.arrowHidden]}
          >
            <Feather name="chevron-right" size={32} color={colors.white} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  // Vertical room so a card scaled up on hover is not clipped by the scroll area.
  content: { paddingVertical: spacing.xl },
  lifted: { zIndex: 10 },
  arrow: {
    position: 'absolute',
    top: spacing.xl,
    bottom: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  arrowHidden: { opacity: 0 },
}));
