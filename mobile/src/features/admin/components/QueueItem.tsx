import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, radius, spacing } from '@/theme';
import type { AdminCourseQueueItemDto } from '@/types/api';
import { formatPriceOrFree } from '@/utils/formatPrice';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

import { isRevisionItem } from '../adminMeta';
import { CourseStatusBadge } from './CourseStatusBadge';

export type QueueItemProps = {
  item: AdminCourseQueueItemDto;
  onPress: (item: AdminCourseQueueItemDto) => void;
};

/** One row of the review queue (SC-32): cover, type + status badges, title, teacher, price and age. */
function QueueItemBase({ item, onPress }: QueueItemProps) {
  const { t } = useTranslation('admin');
  const styles = useStyles();
  const isRevision = isRevisionItem(item);
  const when = item.submittedAt
    ? t('queue.submitted', { when: formatRelativeTime(item.submittedAt) })
    : t('queue.notSubmitted');
  const typeLabel = isRevision ? t('queue.typeBadge.REVISION') : t('queue.typeBadge.COURSE');
  const statusLabel = item.revisionStatus
    ? t(`revisionStatus.${item.revisionStatus}`)
    : t(`status.${item.status}`);
  return (
    <Pressable
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={t('queue.itemLabel', {
        title: item.title,
        type: typeLabel,
        status: statusLabel,
        teacher: item.teacher.fullName,
      })}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
      testID={`queue-item-${item.id}`}
    >
      {item.thumbnailUrl ? (
        <Image
          source={{ uri: item.thumbnailUrl }}
          style={styles.thumb}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={item.thumbnailUrl}
        />
      ) : (
        <View style={styles.thumb} />
      )}
      <View style={styles.body}>
        <View style={styles.badges}>
          <Badge label={typeLabel} tone={isRevision ? 'secondary' : 'primary'} shape="pill" />
          {item.revisionStatus ? (
            <CourseStatusBadge revisionStatus={item.revisionStatus} />
          ) : (
            <CourseStatusBadge status={item.status} />
          )}
        </View>
        <AppText variant="cardTitle" numberOfLines={2}>
          {item.title}
        </AppText>
        <AppText variant="caption" color="textSecondary" numberOfLines={1}>
          {item.teacher.fullName} · {item.category.name}
        </AppText>
        <AppText variant="caption" numberOfLines={1}>
          {formatPriceOrFree(item.priceCents)} · {t('queue.lessons', { count: item.lessonCount })} ·{' '}
          {when}
        </AppText>
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 48,
    padding: spacing.md,
    marginHorizontal: layout.screenPaddingX,
    marginBottom: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
  },
  pressed: { backgroundColor: t.colors.surfaceAlt },
  thumb: {
    width: 88,
    height: 62,
    borderRadius: radius.button,
    backgroundColor: t.colors.surface,
  },
  body: { flex: 1, gap: spacing.xs },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
}));

export const QueueItem = memo(QueueItemBase);
