import { Image } from 'expo-image';
import { memo } from 'react';
import { View } from 'react-native';

import { TableCell, TableRow, type TableColumn } from '@/components/layout/work';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing } from '@/theme';
import type { AdminCourseQueueItemDto } from '@/types/api';
import { formatPriceOrFree } from '@/utils/formatPrice';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

import { isRevisionItem } from '../../adminMeta';
import { CourseStatusBadge } from '../CourseStatusBadge';

/** Columns of the review queue table; the optional ones only exist on a desktop window. */
export type QueueColumns = {
  course: TableColumn;
  teacher?: TableColumn;
  type: TableColumn;
  status: TableColumn;
  price: TableColumn;
  lessons?: TableColumn;
  submitted?: TableColumn;
};

export type QueueTableRowProps = {
  item: AdminCourseQueueItemDto;
  columns: QueueColumns;
  isLast: boolean;
  /** Keep this callback stable (`useCallback`) so `React.memo` can skip re-renders. */
  onPress: (item: AdminCourseQueueItemDto) => void;
};

const THUMB_WIDTH = 72;
const THUMB_HEIGHT = 44;

/** One submission of the review queue as a table row (SC-32, PC); the whole row opens SC-33. */
function QueueTableRowBase({ item, columns, isLast, onPress }: QueueTableRowProps) {
  const { t } = useTranslation('admin');
  const styles = useStyles();
  const isRevision = isRevisionItem(item);
  const typeLabel = isRevision ? t('queue.typeBadge.REVISION') : t('queue.typeBadge.COURSE');
  const statusLabel = item.revisionStatus
    ? t(`revisionStatus.${item.revisionStatus}`)
    : t(`status.${item.status}`);
  const submitted = item.submittedAt
    ? t('queue.submitted', { when: formatRelativeTime(item.submittedAt) })
    : t('queue.notSubmitted');
  const caption = columns.teacher
    ? item.category.name
    : `${item.teacher.fullName} · ${item.category.name}`;
  return (
    <TableRow
      onPress={() => onPress(item)}
      isLast={isLast}
      accessibilityLabel={t('queue.itemLabel', {
        title: item.title,
        type: typeLabel,
        status: statusLabel,
        teacher: item.teacher.fullName,
      })}
      testID={`queue-item-${item.id}`}
    >
      <TableCell column={columns.course}>
        <View style={styles.courseCell}>
          {item.thumbnailUrl ? (
            <Image
              source={{ uri: item.thumbnailUrl }}
              style={styles.thumb}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={item.thumbnailUrl}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={styles.thumb} />
          )}
          <View style={styles.titles}>
            <AppText variant="cardTitle" numberOfLines={2}>
              {item.title}
            </AppText>
            <AppText variant="caption" color="textSecondary" numberOfLines={2}>
              {caption}
            </AppText>
          </View>
        </View>
      </TableCell>
      {columns.teacher ? (
        <TableCell column={columns.teacher}>
          <AppText variant="label" numberOfLines={2}>
            {item.teacher.fullName}
          </AppText>
        </TableCell>
      ) : null}
      <TableCell column={columns.type}>
        <Badge label={typeLabel} tone={isRevision ? 'secondary' : 'primary'} shape="pill" />
      </TableCell>
      <TableCell column={columns.status}>
        {item.revisionStatus ? (
          <CourseStatusBadge revisionStatus={item.revisionStatus} />
        ) : (
          <CourseStatusBadge status={item.status} />
        )}
      </TableCell>
      <TableCell column={columns.price}>
        <AppText variant="label">{formatPriceOrFree(item.priceCents)}</AppText>
      </TableCell>
      {columns.lessons ? (
        <TableCell column={columns.lessons}>
          <AppText variant="caption">{item.lessonCount}</AppText>
        </TableCell>
      ) : null}
      {columns.submitted ? (
        <TableCell column={columns.submitted}>
          <AppText variant="caption">{submitted}</AppText>
        </TableCell>
      ) : null}
    </TableRow>
  );
}

export const QueueTableRow = memo(QueueTableRowBase);

const useStyles = makeStyles((t) => ({
  courseCell: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  thumb: {
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
    borderRadius: radius.button,
    backgroundColor: t.colors.surface,
  },
  titles: { flex: 1, minWidth: 0, gap: spacing.xxs },
}));
