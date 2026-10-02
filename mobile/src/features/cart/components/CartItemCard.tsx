import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { PriceTag } from '@/components/course';
import { AppText, IconButton } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { CourseSummary } from '@/types/api';

export type CartItemCardProps = {
  course: CourseSummary;
  /** Dims the card while its DELETE request is in flight. */
  isRemoving: boolean;
  /** Keep these callbacks stable (`useCallback`) so `React.memo` can skip re-renders. */
  onPress: (course: CourseSummary) => void;
  onRemove: (course: CourseSummary) => void;
};

const THUMBNAIL_SIZE = 80;

/** One cart row: thumbnail, title, teacher, price (+ struck original) and a remove button. */
function CartItemCardBase({ course, isRemoving, onPress, onRemove }: CartItemCardProps) {
  return (
    <View style={[styles.card, isRemoving ? styles.removing : null]}>
      <Pressable
        onPress={() => onPress(course)}
        accessibilityRole="button"
        accessibilityLabel={`${course.title}, by ${course.teacher.fullName}. Open course`}
        style={styles.pressable}
      >
        <View style={styles.imageWrap}>
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
          containerSize={32}
          disabled={isRemoving}
          onPress={() => onRemove(course)}
          accessibilityLabel={`Remove ${course.title} from cart`}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
  },
  removing: { opacity: 0.5 },
  pressable: { flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  imageWrap: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    overflow: 'hidden',
    borderRadius: radius.button,
    backgroundColor: colors.surface,
  },
  info: { flex: 1, justifyContent: 'center', gap: spacing.xxs },
  title: { paddingRight: spacing.xxl },
  price: { marginTop: spacing.xs },
  remove: { position: 'absolute', top: spacing.xs, right: spacing.xs },
});

export const CartItemCard = memo(CartItemCardBase);
