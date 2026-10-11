import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { memo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { PriceTag } from '@/components/course';
import { useHover } from '@/components/layout/useHover';
import { pointerStyle } from '@/components/layout/work';
import { AppText, RatingInline } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';
import type { CourseSummary } from '@/types/api';

export type CartItemRowDesktopProps = {
  course: CourseSummary;
  /** Dims the row while its DELETE request is in flight. */
  isRemoving: boolean;
  /** Keep these callbacks stable (`useCallback`) so `React.memo` can skip re-renders. */
  onOpen: (course: CourseSummary) => void;
  onRemove: (course: CourseSummary) => void;
};

const THUMB_WIDTH = 208;

type RemoveLinkProps = { course: CourseSummary; disabled: boolean; onRemove: () => void };

/** Remove text button: turns red on hover. */
function RemoveLink({ course, disabled, onRemove }: RemoveLinkProps) {
  const { t } = useTranslation('cart');
  const { colors } = useTheme();
  const styles = useStyles();
  const { isHovered, hoverProps } = useHover();
  const color = isHovered ? colors.dangerText : colors.textSecondary;
  return (
    <Pressable
      {...hoverProps}
      onPress={onRemove}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={t('item.remove', { title: course.title })}
      style={[styles.remove, isHovered ? styles.removeHover : null]}
      testID={`cart-remove-${course.id}`}
    >
      <Feather name="trash-2" size={16} color={color} />
      <AppText variant="label" style={{ color }}>
        {t('item.removeShort')}
      </AppText>
    </Pressable>
  );
}

/**
 * One row of the PC cart: 16:9 photo, title, teacher and rating on the left (all open the course),
 * price and the Remove link on the right. The hairline turns accent while the pointer is over it.
 */
function CartItemRowDesktopBase({ course, isRemoving, onOpen, onRemove }: CartItemRowDesktopProps) {
  const { t } = useTranslation('cart');
  const styles = useStyles();
  const [isHovered, setIsHovered] = useState(false);
  return (
    <View
      style={[styles.row, isHovered ? styles.rowHover : null, isRemoving ? local.removing : null]}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      testID={`cart-row-${course.id}`}
    >
      <Pressable
        onPress={() => onOpen(course)}
        accessibilityRole="button"
        accessibilityLabel={t('item.open', {
          title: course.title,
          teacher: course.teacher.fullName,
        })}
        style={[local.main, pointerStyle]}
      >
        <View style={styles.photo}>
          <Image
            source={{ uri: course.thumbnailUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
            recyclingKey={course.id}
            accessibilityIgnoresInvertColors
          />
        </View>
        <View style={local.info}>
          <AppText variant="title" numberOfLines={2}>
            {course.title}
          </AppText>
          <AppText variant="caption" numberOfLines={1}>
            {course.teacher.fullName}
          </AppText>
          <RatingInline
            rating={course.ratingAvg}
            count={course.ratingCount}
            lessonCount={course.lessonCount}
          />
        </View>
      </Pressable>
      <View style={local.side}>
        <PriceTag priceCents={course.priceCents} originalPriceCents={course.originalPriceCents} />
        <RemoveLink course={course} disabled={isRemoving} onRemove={() => onRemove(course)} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
  },
  rowHover: { borderColor: t.colors.primaryText, backgroundColor: t.colors.surfaceAlt },
  photo: {
    width: THUMB_WIDTH,
    aspectRatio: 16 / 9,
    overflow: 'hidden',
    borderRadius: radius.button,
    backgroundColor: t.colors.surface,
  },
  remove: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 32,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    ...pointerStyle,
  },
  removeHover: { backgroundColor: t.colors.dangerSoft },
}));

const local = StyleSheet.create({
  removing: { opacity: 0.5 },
  main: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  info: { flex: 1, minWidth: 0, gap: spacing.xs },
  side: { alignItems: 'flex-end', gap: spacing.sm },
});

export const CartItemRowDesktop = memo(CartItemRowDesktopBase);
