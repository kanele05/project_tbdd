import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { colors, layout, radius, spacing } from '@/theme';
import type { TeacherDetail } from '@/types/api';

import { formatTeacherPlace, useNow } from '../localTime';

export type TeacherProfileHeaderProps = {
  teacher: TeacherDetail;
};

const COVER_HEIGHT = 128;
const AVATAR_SIZE = 96;
/** Design: the avatar's top edge sits 44 dp above the cover's bottom edge. */
const AVATAR_OVERLAP = 44;

/**
 * Top of SC-18: cover, round avatar overlapping the cover (secondaryLight background), name +
 * "Teacher" badge, job title and "{location} - {local time}" (BR-16, `hh:mm A`).
 */
function TeacherProfileHeaderBase({ teacher }: TeacherProfileHeaderProps) {
  const now = useNow();
  const place = formatTeacherPlace(teacher.location, teacher.timezone, now);

  return (
    <View style={styles.container}>
      <View style={styles.cover}>
        {teacher.coverUrl ? (
          <Image
            source={{ uri: teacher.coverUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
            accessibilityIgnoresInvertColors
          />
        ) : null}
      </View>

      <View style={styles.identity}>
        <Avatar uri={teacher.avatarUrl} name={teacher.fullName} size={AVATAR_SIZE} />
        <View style={styles.nameRow}>
          <AppText variant="h3" align="center" accessibilityRole="header">
            {teacher.fullName}
          </AppText>
          <Badge label="Teacher" shape="pill" style={styles.badge} />
        </View>
        {teacher.jobTitle ? (
          <AppText variant="body" color="textSecondary" align="center" style={styles.jobTitle}>
            {teacher.jobTitle}
          </AppText>
        ) : null}
        {place ? (
          <View style={styles.place} accessible accessibilityLabel={`Location: ${place}`}>
            <Feather name="map-pin" size={14} color={colors.textSecondary} />
            <AppText variant="body" color="textSecondary">
              {place}
            </AppText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: layout.screenPaddingX },
  cover: {
    height: COVER_HEIGHT,
    overflow: 'hidden',
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  // Vertical rhythm measured from the design: avatar bottom -> name row 8, name row -> job 12,
  // job -> location 8.
  identity: { alignItems: 'center', marginTop: -AVATAR_OVERLAP },
  nameRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  badge: { alignSelf: 'center' },
  jobTitle: { marginTop: spacing.md },
  place: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
});

export const TeacherProfileHeader = memo(TeacherProfileHeaderBase);
