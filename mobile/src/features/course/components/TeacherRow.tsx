import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Avatar } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { CourseDetail } from '@/types/api';

export type TeacherRowProps = {
  teacher: CourseDetail['teacher'];
  onOpenTeacher: () => void;
  onToggleFollow: () => void;
};

const AVATAR_SIZE = 36;
const FOLLOW_HEIGHT = 28;
const FOLLOW_MIN_WIDTH = 67;
/** `primaryTrack` at 60 % over the white screen = the design's #C8F9FF Follow background. */
const FOLLOW_BACKGROUND = `${colors.primaryTrack}99`;
/** Vertical `hitSlop` that lifts the 36 dp avatar / 28 dp button rows to a 48 dp touch target. */
const AVATAR_SLOP = { top: 6, bottom: 6 } as const;
const FOLLOW_SLOP = { top: 10, bottom: 10 } as const;

/** Overview tab: avatar, name, job title and the Follow / Following button (design). */
function TeacherRowBase({ teacher, onOpenTeacher, onToggleFollow }: TeacherRowProps) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onOpenTeacher}
        accessibilityRole="button"
        accessibilityLabel={`${teacher.fullName}, ${teacher.jobTitle}. Open profile`}
        hitSlop={AVATAR_SLOP}
        style={styles.info}
      >
        <Avatar uri={teacher.avatarUrl} name={teacher.fullName} size={AVATAR_SIZE} />
        <View style={styles.texts}>
          <AppText variant="body" numberOfLines={1}>
            {teacher.fullName}
          </AppText>
          <AppText variant="caption" numberOfLines={1}>
            {teacher.jobTitle}
          </AppText>
        </View>
      </Pressable>
      <Pressable
        onPress={onToggleFollow}
        hitSlop={FOLLOW_SLOP}
        accessibilityRole="button"
        accessibilityLabel={
          teacher.isFollowed ? `Unfollow ${teacher.fullName}` : `Follow ${teacher.fullName}`
        }
        style={({ pressed }) => [
          styles.follow,
          { backgroundColor: pressed ? colors.primaryTrack : FOLLOW_BACKGROUND },
        ]}
      >
        <AppText variant="caption" color="textPrimary" numberOfLines={1}>
          {teacher.isFollowed ? 'Following' : 'Follow'}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  info: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  texts: { flex: 1 },
  follow: {
    minWidth: FOLLOW_MIN_WIDTH,
    height: FOLLOW_HEIGHT,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.badge,
  },
});

export const TeacherRow = memo(TeacherRowBase);
