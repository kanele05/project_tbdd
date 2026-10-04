import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { PriceTag } from '@/components/course';
import { AppText, IconButton } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, radius, spacing } from '@/theme';
import type { CourseSummary } from '@/types/api';

export type CartItemCardProps = {
  course: CourseSummary;
  /** Dims the card while its DELETE request is in flight. */
  isRemoving: boolean;
  /** Keep these callbacks stable (`useCallback`) so `React.memo` can skip re-renders. */
  onPress: (course: CourseSummary) => void;
  onRemove: (course: CourseSummary) => void;
};

const THUMBNAIL_SIZE = 92;

/** One cart row: thumbnail, title, teacher, price (+ struck original) and a remove button. */
function CartItemCardBase({ course, isRemoving, onPress, onRemove }: CartItemCardProps) {
  const { t } = useTranslation('cart');
  const themed = useStyles();
  return (
    <View style={[themed.card, isRemoving ? styles.removing : null]}>
      <Pressable
        onPress={() => onPress(course)}
        accessibilityRole="button"
        accessibilityLabel={t('item.open', {
          title: course.title,
          teacher: course.teacher.fullName,
        })}
        style={styles.pressable}
      >
        <View style={themed.imageWrap}>
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
        <View style={styles.info}>
          <AppText variant="cardTitle" numberOfLines={2} style={styles.title}>
            {course.title}
          </AppText>
          <AppText variant="caption" numberOfLines={1}>
            {course.teacher.fullName}
          </AppText>
          <PriceTag
            priceCents={course.priceCents}
            originalPriceCents={course.originalPriceCents}
            style={styles.price}
          />
        </View>
      </Pressable>
      <View style={styles.remove}>
        <IconButton
          icon="trash-2"
          size={20}
          color="textMuted"
          containerSize={40}
          disabled={isRemoving}
          onPress={() => onRemove(course)}
          accessibilityLabel={t('item.remove', { title: course.title })}
        />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    backgroundColor: t.colors.card,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    borderRadius: radius.card,
  },
  imageWrap: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    overflow: 'hidden',
    borderRadius: radius.button,
    backgroundColor: t.colors.surface,
  },
}));

const styles = StyleSheet.create({
  removing: { opacity: 0.5 },
  pressable: { flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  info: { flex: 1, justifyContent: 'center', gap: spacing.xxs },
  // Leaves room for the remove button in the top-right corner.
  title: { paddingRight: layout.minTouchTarget - spacing.sm },
  price: { marginTop: spacing.xs },
  remove: { position: 'absolute', top: 0, right: 0 },
});

export const CartItemCard = memo(CartItemCardBase);
