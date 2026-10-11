import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';
import type { StudioCourseSummaryDto } from '@/types/api';
import { formatPriceOrFree } from '@/utils/formatPrice';

import { StatusChip } from './StatusChip';

export type StudioCourseCardProps = {
  course: StudioCourseSummaryDto;
  /** Keep this callback stable (`useCallback`) so `React.memo` can skip re-renders in lists. */
  onPress: (course: StudioCourseSummaryDto) => void;
};

const THUMBNAIL_SIZE = 88;

/**
 * Row of the Studio list (SC-23): cover (a placeholder icon until one is uploaded), title, status
 * chip (+ the revision chip of a published course), price and student count, and the rejection
 * reason of a rejected course so the teacher sees at a glance what to fix.
 */
function StudioCourseCardBase({ course, onPress }: StudioCourseCardProps) {
  const { t } = useTranslation(['studio', 'common']);
  const { colors } = useTheme();
  const styles = useStyles();
  const price = formatPriceOrFree(course.priceCents);
  const students = t('studio:card.students', { count: course.enrollmentCount });
  return (
    <Pressable
      onPress={() => onPress(course)}
      accessibilityRole="button"
      accessibilityLabel={t('studio:card.label', {
        title: course.title,
        status: t(`studio:status.${course.status}`),
        price,
        students,
      })}
      testID={`studio-course-${course.id}`}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View style={styles.imageWrap}>
        {course.thumbnailUrl ? (
          <Image
            source={{ uri: course.thumbnailUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
            recyclingKey={course.id}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={styles.noImage} testID="studio-card-no-cover">
            <Feather name="image" size={28} color={colors.iconMuted} />
          </View>
        )}
      </View>
      <View style={styles.info}>
        <AppText variant="cardTitle" numberOfLines={2}>
          {course.title}
        </AppText>
        <View style={styles.chips}>
          <StatusChip status={course.status} />
          {course.revisionStatus ? <StatusChip revision={course.revisionStatus} /> : null}
        </View>
        <AppText variant="caption" numberOfLines={1}>
          {price} · {students}
        </AppText>
        {course.status === 'REJECTED' && course.rejectionReason ? (
          <AppText variant="caption" color="dangerText" numberOfLines={2}>
            {t('studio:card.rejectedReason', { reason: course.rejectionReason })}
          </AppText>
        ) : null}
        <AppText variant="micro" color="textMuted">
          {t('common:lessons.count', { count: course.lessonCount })}
        </AppText>
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
  },
  pressed: { backgroundColor: t.colors.surfaceAlt },
  imageWrap: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    overflow: 'hidden',
    borderRadius: radius.button,
    backgroundColor: t.colors.surface,
  },
  noImage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: spacing.xs, justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
}));

export const StudioCourseCard = memo(StudioCourseCardBase);

/** Loading placeholder with the same footprint as `StudioCourseCard`. */
export function StudioCourseCardSkeleton() {
  const styles = useStyles();
  return (
    <View style={styles.card} testID="studio-card-skeleton">
      <Skeleton width={THUMBNAIL_SIZE} height={THUMBNAIL_SIZE} borderRadius={radius.button} />
      <View style={styles.info}>
        <Skeleton width="90%" height={18} />
        <Skeleton width={96} height={20} borderRadius={radius.pill} />
        <Skeleton width="55%" height={14} />
      </View>
    </View>
  );
}
