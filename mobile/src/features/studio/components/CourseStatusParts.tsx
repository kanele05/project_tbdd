import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { useHover } from '@/components/layout/useHover';
import { pointerStyle } from '@/components/layout/work';
import { AppText } from '@/components/ui/AppText';
import type { FeatherIconName } from '@/components/ui/icons';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';
import type { StudioCourseDetailDto } from '@/types/api';
import { formatPriceOrFree } from '@/utils/formatPrice';

import { StatusChip } from './StatusChip';

type LinkPath =
  | '/studio/[id]/edit'
  | '/studio/[id]/curriculum'
  | '/studio/[id]/stats'
  | '/studio/[id]/submissions';

type QuickLinkProps = {
  icon: FeatherIconName;
  label: string;
  path: LinkPath;
  courseId: string;
};

function QuickLink({ icon, label, path, courseId }: QuickLinkProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { isHovered, hoverProps } = useHover();
  return (
    <Pressable
      {...hoverProps}
      onPress={() => router.push({ pathname: path, params: { id: courseId } })}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.link, pressed || isHovered ? styles.linkActive : null]}
      testID={`status-link-${path.split('/').pop()}`}
    >
      <Feather name={icon} size={20} color={colors.primaryText} />
      <AppText variant="body" family="bodyMedium" style={styles.linkText}>
        {label}
      </AppText>
      <Feather name="chevron-right" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

/** Shortcuts of the status screen: the editors, and (once published or sold) stats + submissions. */
export function StatusLinks({ detail }: { detail: StudioCourseDetailDto }) {
  const { t } = useTranslation('studio');
  const styles = useStyles();
  const showStats = detail.publishedAt !== null || detail.enrollmentCount > 0;
  return (
    <View style={styles.links}>
      <QuickLink
        icon="edit-2"
        label={t('status.links.edit')}
        path="/studio/[id]/edit"
        courseId={detail.id}
      />
      <QuickLink
        icon="list"
        label={t('status.links.curriculum')}
        path="/studio/[id]/curriculum"
        courseId={detail.id}
      />
      {showStats ? (
        <>
          <QuickLink
            icon="bar-chart-2"
            label={t('status.links.stats')}
            path="/studio/[id]/stats"
            courseId={detail.id}
          />
          <QuickLink
            icon="inbox"
            label={t('status.links.submissions')}
            path="/studio/[id]/submissions"
            courseId={detail.id}
          />
        </>
      ) : null}
    </View>
  );
}

/** Cover, title, status chips, price and students of the course at the top of the status screen. */
export function StatusHero({
  detail,
  isLarge = false,
}: {
  detail: StudioCourseDetailDto;
  /** Bigger cover and title for the PC layout. */
  isLarge?: boolean;
}) {
  const { t } = useTranslation('studio');
  const styles = useStyles();
  return (
    <View style={styles.hero}>
      <View style={[styles.thumb, isLarge ? styles.thumbLarge : null]}>
        {detail.thumbnailUrl ? (
          <Image
            source={{ uri: detail.thumbnailUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            accessibilityIgnoresInvertColors
          />
        ) : null}
      </View>
      <View style={styles.heroText}>
        <AppText variant={isLarge ? 'h2' : 'h3'} numberOfLines={3}>
          {detail.title}
        </AppText>
        <View style={styles.chips}>
          <StatusChip status={detail.status} />
          {detail.revision ? <StatusChip revision={detail.revision.status} /> : null}
        </View>
        <AppText variant="caption">
          {formatPriceOrFree(detail.priceCents)} ·{' '}
          {t('card.students', { count: detail.enrollmentCount })}
        </AppText>
      </View>
    </View>
  );
}

const THUMB = 88;
const THUMB_LARGE_WIDTH = 176;
const THUMB_LARGE_HEIGHT = 100;

const useStyles = makeStyles((t) => ({
  hero: { flexDirection: 'row', gap: spacing.md },
  thumb: {
    width: THUMB,
    height: THUMB,
    overflow: 'hidden',
    borderRadius: radius.button,
    backgroundColor: t.colors.surface,
  },
  thumbLarge: { width: THUMB_LARGE_WIDTH, height: THUMB_LARGE_HEIGHT },
  heroText: { flex: 1, gap: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  links: { gap: spacing.sm },
  link: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
    ...pointerStyle,
  },
  linkActive: { backgroundColor: t.colors.surfaceAlt },
  linkText: { flex: 1 },
}));
