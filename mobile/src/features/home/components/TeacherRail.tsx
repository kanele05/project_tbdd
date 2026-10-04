import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Avatar, RailList } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { formatNumber } from '@/i18n/format';
import { darkPalette, radius, spacing, withAlpha } from '@/theme';
import type { TeacherSummary } from '@/types/api';

const CARD_WIDTH = 140;
const CARD_HEIGHT = 196;

type TeacherPortraitProps = { teacher: TeacherSummary; onPress: (teacherId: string) => void };

/** Portrait card: the photo fills the card, name / organization / rating sit on a black fade. */
const TeacherPortrait = memo(function TeacherPortrait({ teacher, onPress }: TeacherPortraitProps) {
  const { t } = useTranslation('home');
  const rating = formatNumber(teacher.ratingAvg, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const organization = teacher.organization ?? '';
  return (
    <Pressable
      onPress={() => onPress(teacher.id)}
      accessibilityRole="button"
      accessibilityLabel={
        organization
          ? t('teacher.label', { name: teacher.fullName, organization, rating })
          : t('teacher.labelNoOrganization', { name: teacher.fullName, rating })
      }
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      {teacher.avatarUrl ? (
        <Image
          source={{ uri: teacher.avatarUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition="top"
          cachePolicy="memory-disk"
          transition={150}
          recyclingKey={teacher.id}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={styles.fallback}>
          <Avatar name={teacher.fullName} size={72} />
        </View>
      )}
      <LinearGradient
        colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.9)']}
        locations={[0.4, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.text}>
        <AppText variant="label" color="white" numberOfLines={2}>
          {teacher.fullName}
        </AppText>
        {organization ? (
          <AppText variant="micro" numberOfLines={1} style={styles.organization}>
            {organization}
          </AppText>
        ) : null}
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={12} color={darkPalette.star} />
          <AppText variant="micro" color="white">
            {rating}
          </AppText>
        </View>
      </View>
    </Pressable>
  );
});

type TeacherRailProps = {
  title: string;
  teachers: readonly TeacherSummary[];
  onPressTeacher: (teacherId: string) => void;
  onViewMore: () => void;
};

function keyExtractor(teacher: TeacherSummary): string {
  return teacher.id;
}

/** "Top teachers" rail of Home (SC-04). */
export function TeacherRail({ title, teachers, onPressTeacher, onViewMore }: TeacherRailProps) {
  const renderItem = useCallback(
    (teacher: TeacherSummary) => <TeacherPortrait teacher={teacher} onPress={onPressTeacher} />,
    [onPressTeacher],
  );
  return (
    <RailList
      title={title}
      onViewMore={onViewMore}
      data={teachers}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderRadius: radius.card,
    backgroundColor: darkPalette.surface,
  },
  pressed: { opacity: 0.88 },
  fallback: { ...StyleSheet.absoluteFill, alignItems: 'center', paddingTop: spacing.xl },
  text: { padding: spacing.md, gap: spacing.xxs },
  organization: { color: withAlpha(darkPalette.white, 0.88) },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
