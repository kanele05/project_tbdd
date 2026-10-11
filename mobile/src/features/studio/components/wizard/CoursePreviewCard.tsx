import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';
import { formatDuration } from '@/utils/formatDuration';
import { formatPrice, formatPriceOrFree } from '@/utils/formatPrice';

export type CoursePreviewCardProps = {
  title: string;
  subtitle: string;
  thumbnailUrl: string;
  priceCents: number;
  originalPriceCents: number | null;
  lessonCount: number;
  durationSec: number;
};

/** "How learners will see it": cover, title, subtitle, price and size of the course. */
export function CoursePreviewCard({
  title,
  subtitle,
  thumbnailUrl,
  priceCents,
  originalPriceCents,
  lessonCount,
  durationSec,
}: CoursePreviewCardProps) {
  const { t } = useTranslation('studio');
  const { t: tc } = useTranslation('common');
  const { colors } = useTheme();
  const styles = useStyles();
  const displayTitle = title.trim() || t('wizard.review.untitled');
  const price = formatPriceOrFree(priceCents);
  const meta = t('wizard.review.meta', {
    lessons: tc('lessons.count', { count: lessonCount }),
    duration: formatDuration(durationSec),
  });
  const hasOriginal = originalPriceCents !== null && originalPriceCents > priceCents;
  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={t('wizard.review.previewLabel', { title: displayTitle, price, meta })}
      testID="review-preview"
    >
      <View style={styles.cover}>
        {thumbnailUrl ? (
          <Image
            source={{ uri: thumbnailUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <Feather name="image" size={32} color={colors.iconMuted} />
        )}
      </View>
      <View style={styles.body}>
        <AppText variant="h3" numberOfLines={3}>
          {displayTitle}
        </AppText>
        {subtitle.trim() ? (
          <AppText color="textSecondary" numberOfLines={3}>
            {subtitle.trim()}
          </AppText>
        ) : null}
        <View style={styles.priceRow}>
          <AppText variant="title" color="primaryText">
            {price}
          </AppText>
          {hasOriginal ? (
            <AppText variant="caption" style={styles.strike}>
              {formatPrice(originalPriceCents)}
            </AppText>
          ) : null}
        </View>
        <AppText variant="caption">{meta}</AppText>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    overflow: 'hidden',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
  },
  cover: {
    width: '100%',
    aspectRatio: 16 / 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.surface,
  },
  body: { gap: spacing.xs, padding: spacing.lg },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  strike: { textDecorationLine: 'line-through' },
}));
