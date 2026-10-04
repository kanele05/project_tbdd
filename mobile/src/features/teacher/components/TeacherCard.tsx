import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { getInitials } from '@/components/ui/Avatar';
import { useTranslation } from '@/i18n';
import { formatNumber } from '@/i18n/format';
import { makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';
import type { TeacherSummary } from '@/types/api';

export type TeacherCardProps = {
  teacher: TeacherSummary;
  /** Keep this callback stable (`useCallback`) so `React.memo` can skip re-renders in lists. */
  onPress: () => void;
  /** Overrides the default width (Home rail); pass `{ width: '100%' }` in a grid. */
  style?: StyleProp<ViewStyle>;
};

/** Card width of the Home "Top teachers" rail. */
export const TEACHER_CARD_WIDTH = 152;
/** The portrait is 3 : 4 (width : height) and fills the whole card. */
const CARD_ASPECT_RATIO = 3 / 4;

/**
 * Portrait card of "Top teachers" (Home, SC-19): the photo fills the card, a black gradient at the
 * bottom carries the white name, organization and the gold rating (concept B). Tapping opens the
 * teacher profile (SC-18).
 */
function TeacherCardBase({ teacher, onPress, style }: TeacherCardProps) {
  const { t } = useTranslation('teacher');
  const { colors } = useTheme();
  const themed = useStyles();
  const rating = formatNumber(teacher.ratingAvg, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const label = teacher.organization
    ? t('card.label', { name: teacher.fullName, organization: teacher.organization, rating })
    : t('card.labelNoOrg', { name: teacher.fullName, rating });

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [themed.card, pressed ? styles.pressed : null, style]}
    >
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
        <View style={[styles.fallback, themed.fallbackFill]}>
          <AppText variant="h1" color="secondaryText">
            {getInitials(teacher.fullName) || '?'}
          </AppText>
        </View>
      )}
      <LinearGradient
        colors={[
          withAlpha(colors.scrim, 0),
          withAlpha(colors.scrim, 0.78),
          withAlpha(colors.scrim, 0.94),
        ]}
        locations={[0, 0.55, 1]}
        style={styles.scrim}
      />
      <View style={styles.info}>
        <AppText variant="cardTitle" color="white" numberOfLines={1}>
          {teacher.fullName}
        </AppText>
        {teacher.organization ? (
          <AppText
            variant="caption"
            numberOfLines={1}
            style={{ color: withAlpha(colors.white, 0.88) }}
          >
            {teacher.organization}
          </AppText>
        ) : null}
        <View style={styles.rating}>
          <Ionicons name="star" size={13} color={colors.star} />
          <AppText variant="caption" color="white" family="bodySemiBold">
            {rating}
          </AppText>
          <AppText variant="caption" style={{ color: withAlpha(colors.white, 0.88) }}>
            {`(${teacher.ratingCount})`}
          </AppText>
        </View>
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    width: TEACHER_CARD_WIDTH,
    aspectRatio: CARD_ASPECT_RATIO,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    borderRadius: radius.card,
    backgroundColor: t.colors.secondarySoft,
  },
  fallbackFill: { backgroundColor: t.colors.secondarySoft },
}));

const styles = StyleSheet.create({
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  fallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '62%' },
  info: { padding: spacing.md, gap: spacing.xxs },
  rating: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});

export const TeacherCard = memo(TeacherCardBase);
