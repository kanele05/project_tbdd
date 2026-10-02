import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Avatar, Button } from '@/components/ui';
import { spacing } from '@/theme';
import type { CourseDetail } from '@/types/api';

export type TeacherRowProps = {
  teacher: CourseDetail['teacher'];
  onOpenTeacher: () => void;
  onToggleFollow: () => void;
};

/** Overview tab: avatar, name, job title and the Follow / Following button (design). */
function TeacherRowBase({ teacher, onOpenTeacher, onToggleFollow }: TeacherRowProps) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onOpenTeacher}
        accessibilityRole="button"
        accessibilityLabel={`${teacher.fullName}, ${teacher.jobTitle}. Open profile`}
        style={styles.info}
      >
        <Avatar uri={teacher.avatarUrl} name={teacher.fullName} size={40} />
        <View style={styles.texts}>
          <AppText variant="body" family="bodyMedium" numberOfLines={1}>
            {teacher.fullName}
          </AppText>
          <AppText variant="caption" numberOfLines={1}>
            {teacher.jobTitle}
          </AppText>
        </View>
      </Pressable>
      <Button
        title={teacher.isFollowed ? 'Following' : 'Follow'}
        variant="secondary"
        size="sm"
        onPress={onToggleFollow}
        accessibilityLabel={
          teacher.isFollowed ? `Unfollow ${teacher.fullName}` : `Follow ${teacher.fullName}`
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  info: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  texts: { flex: 1 },
});

export const TeacherRow = memo(TeacherRowBase);
