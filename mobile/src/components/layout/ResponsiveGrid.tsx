import { Children, useState, type ReactNode } from 'react';
import {
  View,
  type DimensionValue,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { spacing } from '@/theme';

export type ResponsiveGridProps = {
  children: ReactNode;
  /** Bề rộng tối thiểu của một ô; số cột = số ô vừa khung (1…`maxColumns`). */
  minItemWidth?: number;
  maxColumns?: number;
  gap?: number;
  /** Raise the hovered cell above its neighbours, so a card that scales up on hover is not covered. */
  liftOnHover?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

type GridCellProps = { width: DimensionValue; isLiftable: boolean; children: ReactNode };

/** One grid cell; remembers the pointer hover so it can be painted above the next cells. */
function GridCell({ width, isLiftable, children }: GridCellProps) {
  const [isHovered, setIsHovered] = useState(false);
  if (!isLiftable) return <View style={{ width }}>{children}</View>;
  return (
    <View
      style={[{ width }, isHovered ? { zIndex: 10 } : null]}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      {children}
    </View>
  );
}

/** Số cột cho khung rộng `width` (thuần, để test). */
export function getColumnCount(
  width: number,
  minItemWidth: number,
  gap: number,
  maxColumns: number,
): number {
  if (width <= 0) return 1;
  const fit = Math.floor((width + gap) / (minItemWidth + gap));
  return Math.max(1, Math.min(maxColumns, fit));
}

/** Lưới tự chia cột theo bề rộng thật của khung (danh sách khóa học dạng poster trên PC). */
export function ResponsiveGrid({
  children,
  minItemWidth = 220,
  maxColumns = 6,
  gap = spacing.lg,
  liftOnHover = false,
  style,
  testID,
}: ResponsiveGridProps) {
  const [width, setWidth] = useState(0);
  const columns = getColumnCount(width, minItemWidth, gap, maxColumns);
  const itemWidth = width > 0 ? (width - gap * (columns - 1)) / columns : undefined;
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  return (
    <View
      style={[{ flexDirection: 'row', flexWrap: 'wrap', columnGap: gap, rowGap: gap }, style]}
      onLayout={onLayout}
      testID={testID}
    >
      {Children.map(children, (child) => (
        <GridCell width={itemWidth ?? '100%'} isLiftable={liftOnHover}>
          {child}
        </GridCell>
      ))}
    </View>
  );
}
