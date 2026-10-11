import { memo, type ReactNode } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { makeStyles, radius, spacing } from '@/theme';

import { useHover } from '../useHover';
import { pointerStyle } from './workStyles';

/** One column of a PC table: a fixed `width`, or a `flex` share of the remaining row. */
export type TableColumn = {
  key: string;
  label: string;
  flex?: number;
  width?: number;
  align?: 'left' | 'right';
};

/** Layout of a column's cell, shared by the header and every row so they line up. */
export function getColumnStyle(column: TableColumn): ViewStyle {
  const base: ViewStyle = column.width
    ? { width: column.width, flexShrink: 0 }
    : { flex: column.flex ?? 1, minWidth: 0 };
  return column.align === 'right' ? { ...base, alignItems: 'flex-end' } : base;
}

/** Bordered card that holds a header row and the data rows. */
export function TableCard({ children, testID }: { children: ReactNode; testID?: string }) {
  const styles = useStyles();
  return (
    <View style={styles.card} testID={testID}>
      {children}
    </View>
  );
}

/** Column titles; they wrap, so large text and long translations never overflow. */
export function TableHeaderRow({ columns }: { columns: readonly TableColumn[] }) {
  const styles = useStyles();
  return (
    <View style={styles.header} testID="table-header">
      {columns.map((column) => (
        <View key={column.key} style={getColumnStyle(column)}>
          <AppText
            variant="micro"
            family="bodySemiBold"
            color="textSecondary"
            uppercase
            align={column.align}
          >
            {column.label}
          </AppText>
        </View>
      ))}
    </View>
  );
}

export type TableRowProps = {
  children: ReactNode;
  /** Makes the whole row a button (opens the item); omit for rows whose cells hold their own actions. */
  onPress?: () => void;
  accessibilityLabel?: string;
  /** The last row has no bottom hairline. */
  isLast?: boolean;
  testID?: string;
};

/** A data row: hover tint + pointer cursor when it is pressable, hairline between rows. */
function TableRowBase({
  children,
  onPress,
  accessibilityLabel,
  isLast = false,
  testID,
}: TableRowProps) {
  const styles = useStyles();
  const { isHovered, hoverProps } = useHover();
  const rowStyle = [styles.row, isLast ? null : styles.rowDivider];
  if (!onPress) {
    return (
      <View style={rowStyle} testID={testID}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      {...hoverProps}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        ...rowStyle,
        styles.pressable,
        isHovered || pressed ? styles.active : null,
      ]}
      testID={testID}
    >
      {children}
    </Pressable>
  );
}

export const TableRow = memo(TableRowBase);

/** A cell: sized by its column, content centered vertically. */
export function TableCell({ column, children }: { column: TableColumn; children: ReactNode }) {
  const styles = useStyles();
  return <View style={[styles.cell, getColumnStyle(column)]}>{children}</View>;
}

const useStyles = makeStyles((t) => ({
  card: {
    overflow: 'hidden',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.borderSubtle,
    backgroundColor: t.colors.surfaceAlt,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: t.colors.borderSubtle },
  pressable: pointerStyle,
  active: { backgroundColor: t.colors.surfaceAlt },
  cell: { justifyContent: 'center', gap: spacing.xxs },
}));
