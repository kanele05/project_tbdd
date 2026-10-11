import { useMemo } from 'react';

import { TableCard, TableHeaderRow, type TableColumn } from '@/components/layout/work';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslation } from '@/i18n';
import type { AdminCourseQueueItemDto } from '@/types/api';

import { QueueTableRow, type QueueColumns } from './QueueTableRow';

export type QueueTableProps = {
  items: readonly AdminCourseQueueItemDto[];
  /** Keep this callback stable (`useCallback`) so the memoized rows can skip re-renders. */
  onPress: (item: AdminCourseQueueItemDto) => void;
};

/** The review queue as a table with column headers (SC-32, PC). */
export function QueueTable({ items, onPress }: QueueTableProps) {
  const { t } = useTranslation('admin');
  const { isDesktop } = useBreakpoint();
  const columns = useMemo<QueueColumns>(
    () => ({
      course: { key: 'course', label: t('queue.columns.course'), flex: 3 },
      teacher: isDesktop
        ? { key: 'teacher', label: t('queue.columns.teacher'), flex: 1.4 }
        : undefined,
      type: { key: 'type', label: t('queue.columns.type'), width: 110 },
      status: { key: 'status', label: t('queue.columns.status'), width: 130 },
      price: { key: 'price', label: t('queue.columns.price'), width: 80 },
      lessons: isDesktop
        ? { key: 'lessons', label: t('queue.columns.lessons'), width: 70 }
        : undefined,
      submitted: isDesktop
        ? { key: 'submitted', label: t('queue.columns.submitted'), width: 150 }
        : undefined,
    }),
    [isDesktop, t],
  );
  const headerColumns = useMemo(
    () => Object.values(columns).filter((column): column is TableColumn => column !== undefined),
    [columns],
  );
  return (
    <TableCard testID="queue-table">
      <TableHeaderRow columns={headerColumns} />
      {items.map((item, index) => (
        <QueueTableRow
          key={`${item.type}:${item.id}`}
          item={item}
          columns={columns}
          isLast={index === items.length - 1}
          onPress={onPress}
        />
      ))}
    </TableCard>
  );
}
