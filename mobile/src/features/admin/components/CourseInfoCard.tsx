import { Image } from 'expo-image';
import { memo } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Chip } from '@/components/ui/Chip';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, radius, spacing } from '@/theme';
import type { AdminCourseDetailDto } from '@/types/api';
import { formatDuration } from '@/utils/formatDuration';
import { formatPrice, formatPriceOrFree } from '@/utils/formatPrice';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

import { CourseStatusBadge } from './CourseStatusBadge';

export type CourseInfoCardProps = { detail: AdminCourseDetailDto };

function Fact({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.fact} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="caption" color="textSecondary">
        {label}
      </AppText>
      <AppText variant="label">{value}</AppText>
    </View>
  );
}

/** Course overview for the reviewer: cover, status, teacher, key facts and the written content. */
function CourseInfoCardBase({ detail }: CourseInfoCardProps) {
  const { t } = useTranslation('admin');
  const styles = useStyles();
  const priceText =
    detail.originalPriceCents !== null
      ? `${formatPriceOrFree(detail.priceCents)} (${formatPrice(detail.originalPriceCents)})`
      : formatPriceOrFree(detail.priceCents);
  const submitted = detail.submittedAt ? formatRelativeTime(detail.submittedAt) : t('detail.never');

  return (
    <View style={styles.card} testID="course-info">
      {detail.thumbnailUrl ? (
        <Image
          source={{ uri: detail.thumbnailUrl }}
          style={styles.cover}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={detail.thumbnailUrl}
          accessibilityLabel={t('detail.coverOf', { title: detail.title })}
        />
      ) : (
        <View style={styles.cover} />
      )}
      <View style={styles.badges}>
        <CourseStatusBadge status={detail.status} />
        {detail.revision ? <CourseStatusBadge revisionStatus={detail.revision.status} /> : null}
        {detail.reviewTarget ? (
          <Badge
            label={t(
              `queue.typeBadge.${detail.reviewTarget === 'REVISION' ? 'REVISION' : 'COURSE'}`,
            )}
            tone={detail.reviewTarget === 'REVISION' ? 'secondary' : 'primary'}
            shape="pill"
          />
        ) : null}
      </View>
      <AppText variant="h2" accessibilityRole="header">
        {detail.title}
      </AppText>
      {detail.subtitle ? (
        <AppText variant="bodyLarge" color="textSecondary">
          {detail.subtitle}
        </AppText>
      ) : null}

      <View style={styles.teacher}>
        <Avatar uri={detail.teacher.avatarUrl} name={detail.teacher.fullName} size={44} />
        <View style={styles.teacherText}>
          <AppText variant="label">{detail.teacher.fullName}</AppText>
          <AppText variant="caption" color="textSecondary" numberOfLines={1}>
            {detail.teacher.email}
          </AppText>
        </View>
        {detail.teacher.isDisabled ? (
          <Badge label={t('detail.teacherDisabled')} tone="danger" shape="pill" />
        ) : null}
      </View>

      <View style={styles.facts}>
        <Fact label={t('detail.category')} value={detail.category.name} />
        <Fact label={t('detail.price')} value={priceText} />
        <Fact
          label={t('detail.lessons')}
          value={t('queue.lessons', { count: detail.lessonCount })}
        />
        <Fact label={t('detail.duration')} value={formatDuration(detail.totalDurationSec)} />
        <Fact label={t('detail.enrollments')} value={String(detail.enrollmentCount)} />
        <Fact label={t('detail.submitted')} value={submitted} />
      </View>

      {detail.tags.length > 0 ? (
        <View style={styles.tags}>
          {detail.tags.map((tag) => (
            <Chip key={tag.id} label={tag.name} size="sm" />
          ))}
        </View>
      ) : null}

      <View style={styles.text}>
        <AppText variant="label">{t('detail.description')}</AppText>
        <AppText variant="body" color="textSecondary">
          {detail.description || t('detail.noDescription')}
        </AppText>
      </View>
      {detail.benefits.length > 0 ? (
        <View style={styles.text}>
          <AppText variant="label">{t('detail.benefits')}</AppText>
          {detail.benefits.map((benefit, index) => (
            <AppText key={`${index}-${benefit}`} variant="body" color="textSecondary">
              • {benefit}
            </AppText>
          ))}
        </View>
      ) : null}
      {detail.projectDescription ? (
        <View style={styles.text}>
          <AppText variant="label">{t('detail.project')}</AppText>
          <AppText variant="body" color="textSecondary">
            {detail.projectDescription}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
    overflow: 'hidden',
  },
  cover: { width: '100%', aspectRatio: 16 / 9, backgroundColor: t.colors.surface },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  teacher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.lg,
  },
  teacherText: { flex: 1 },
  facts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  fact: { flexGrow: 1, flexBasis: '40%', gap: spacing.xxs },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg },
  text: { gap: spacing.xs, paddingHorizontal: spacing.lg },
}));

export const CourseInfoCard = memo(CourseInfoCardBase);
