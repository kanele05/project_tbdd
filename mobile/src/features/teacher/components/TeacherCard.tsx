import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { getInitials } from '@/components/ui/Avatar';
import { RatingInline } from '@/components/ui/RatingInline';
import { colors, radius, spacing } from '@/theme';
import type { TeacherSummary } from '@/types/api';

export type TeacherCardProps = {
  teacher: TeacherSummary;
  /** Keep this callback stable (`useCallback`) so `React.memo` can skip re-renders in lists. */
  onPress: () => void;
  /** Overrides the default width (Home horizontal list); pass `{ width: '100%' }` in a grid. */
  style?: StyleProp<ViewStyle>;
};

/** Card width of the Home "Top teachers" list (design: x 20 -> 172). */
export const TEACHER_CARD_WIDTH = 152;
const IMAGE_RATIO = 3 / 4; // height / width of the photo

/**
 * M-04b: card of "Top teachers" (Home, SC-19): rounded rectangular photo, name, organization and
 * a "★ 4.5 (1233)" rating line. Tapping opens the teacher profile (SC-18).
 */
function TeacherCardBase({ teacher, onPress, style }: TeacherCardProps) {
  const label = [teacher.fullName, teacher.organization, `rated ${teacher.ratingAvg.toFixed(1)}`]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null, style]}
    >
      <View style={styles.photo}>
        {teacher.avatarUrl ? (
          <Image
            source={{ uri: teacher.avatarUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
            recyclingKey={teacher.id}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={styles.fallback}>
            <AppText variant="h2" color="secondary">
              {getInitials(teacher.fullName) || '?'}
            </AppText>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <AppText variant="cardTitle" numberOfLines={1}>
          {teacher.fullName}
        </AppText>
        {teacher.organization ? (
          <AppText variant="caption" numberOfLines={1}>
            {teacher.organization}
          </AppText>
        ) : null}
        <RatingInline rating={teacher.ratingAvg} count={teacher.ratingCount} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: TEACHER_CARD_WIDTH,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    backgroundColor: colors.background,
  },
  pressed: { opacity: 0.85 },
  photo: {
    width: '100%',
    aspectRatio: 1 / IMAGE_RATIO,
    overflow: 'hidden',
    borderRadius: radius.button,
    backgroundColor: colors.secondaryLight,
  },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  info: { marginTop: spacing.md, gap: spacing.xs },
});

export const TeacherCard = memo(TeacherCardBase);
