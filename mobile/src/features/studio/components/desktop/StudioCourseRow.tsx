import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { TableCell, TableRow, type TableColumn } from '@/components/layout/work';
import { AppText } from '@/components/ui/AppText';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTranslation } from '@/i18n';
import { formatNumber } from '@/i18n/format';
import { makeStyles, radius, spacing, useTheme } from '@/theme';
import type { StudioCourseSummaryDto } from '@/types/api';
import { formatPriceOrFree } from '@/utils/formatPrice';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

import { StatusChip } from '../StatusChip';

/** Column keys of the Studio table; the header and every row read the same list. */
export type StudioColumns = {
  course: TableColumn;
  status: TableColumn;
  price: TableColumn;
  students: TableColumn;
  /** Absent on tablets, where the row is too narrow for a fifth column. */
  updated?: TableColumn;
};

export type StudioCourseRowProps = {
  course: StudioCourseSummaryDto;
  columns: StudioColumns;
  isLast: boolean;
  /** Keep this callback stable (`useCallback`) so `React.memo` can skip re-renders. */
  onPress: (course: StudioCourseSummaryDto) => void;
};

const THUMB_WIDTH = 72;
const THUMB_HEIGHT = 44;

/**
 * Row of the PC Studio table (SC-23): cover thumb + title (+ rejection reason), status chips, price,
 * students and the last update. The whole row opens the course; it tints on hover.
 */
function StudioCourseRowBase({ course, columns, isLast, onPress }: StudioCourseRowProps) {
  const { t } = useTranslation(['studio', 'common']);
  const { colors } = useTheme();
  const styles = useStyles();
  const price = formatPriceOrFree(course.priceCents);
  const students = t('studio:card.students', { count: course.enrollmentCount });
  return (
    <TableRow
      onPress={() => onPress(course)}
      isLast={isLast}
      accessibilityLabel={t('studio:card.label', {
        title: course.title,
        status: t(`studio:status.${course.status}`),
        price,
        students,
      })}
      testID={`studio-course-${course.id}`}
    >
      <TableCell column={columns.course}>
        <View style={styles.courseCell}>
          <View style={styles.thumb}>
            {course.thumbnailUrl ? (
              <Image
                source={{ uri: course.thumbnailUrl }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                cachePolicy="memory-disk"
                recyclingKey={course.id}
                accessibilityIgnoresInvertColors
              />
            ) : (
              <View style={styles.noThumb} testID="studio-card-no-cover">
                <Feather name="image" size={18} color={colors.iconMuted} />
              </View>
            )}
          </View>
          <View style={styles.titles}>
            <AppText variant="cardTitle" numberOfLines={2}>
              {course.title}
            </AppText>
            <AppText variant="caption" numberOfLines={1}>
              {course.category.name} · {t('common:lessons.count', { count: course.lessonCount })}
            </AppText>
            {course.status === 'REJECTED' && course.rejectionReason ? (
              <AppText variant="caption" color="dangerText" numberOfLines={2}>
                {t('studio:card.rejectedReason', { reason: course.rejectionReason })}
              </AppText>
            ) : null}
          </View>
        </View>
      </TableCell>
      <TableCell column={columns.status}>
        <View style={styles.chips}>
          <StatusChip status={course.status} />
          {course.revisionStatus ? <StatusChip revision={course.revisionStatus} /> : null}
        </View>
      </TableCell>
      <TableCell column={columns.price}>
        <AppText variant="label">{price}</AppText>
      </TableCell>
      <TableCell column={columns.students}>
        <AppText variant="label">{formatNumber(course.enrollmentCount)}</AppText>
      </TableCell>
      {columns.updated ? (
        <TableCell column={columns.updated}>
          <AppText variant="caption">{formatRelativeTime(course.updatedAt)}</AppText>
        </TableCell>
      ) : null}
    </TableRow>
  );
}

export const StudioCourseRow = memo(StudioCourseRowBase);

/** Loading placeholder with the footprint of a table row. */
export function StudioCourseRowSkeleton({ isLast }: { isLast: boolean }) {
  const styles = useStyles();
  return (
    <TableRow isLast={isLast} testID="studio-row-skeleton">
      <Skeleton width={THUMB_WIDTH} height={THUMB_HEIGHT} borderRadius={radius.button} />
      <View style={styles.titles}>
        <Skeleton width="60%" height={18} />
        <Skeleton width="30%" height={12} />
      </View>
      <Skeleton width={96} height={20} borderRadius={radius.pill} />
    </TableRow>
  );
}

const useStyles = makeStyles((t) => ({
  courseCell: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  thumb: {
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
    overflow: 'hidden',
    borderRadius: radius.button,
    backgroundColor: t.colors.surface,
  },
  noThumb: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  titles: { flex: 1, minWidth: 0, gap: spacing.xxs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
}));
