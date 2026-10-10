import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Avatar, Button } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { layout, spacing } from '@/theme';
import type { CourseDetail } from '@/types/api';

export type TeacherRowProps = {
  teacher: CourseDetail['teacher'];
  onOpenTeacher: () => void;
  onToggleFollow: () => void;
};

const AVATAR_SIZE = 52;

/** Teacher line under the hero: ringed avatar, name, job title and the Follow / Following button. */
function TeacherRowBase({ teacher, onOpenTeacher, onToggleFollow }: TeacherRowProps) {
  const { t } = useTranslation('course');
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onOpenTeacher}
        accessibilityRole="button"
        accessibilityLabel={t('teacher.openProfile', {
          name: teacher.fullName,
          job: teacher.jobTitle,
        })}
        style={styles.info}
      >
        <Avatar uri={teacher.avatarUrl} name={teacher.fullName} size={AVATAR_SIZE} hasRing />
        <View style={styles.texts}>
          <AppText variant="title" numberOfLines={2}>
            {teacher.fullName}
          </AppText>
          <AppText variant="caption" numberOfLines={1}>
            {teacher.jobTitle}
          </AppText>
        </View>
      </Pressable>
      <Button
        title={teacher.isFollowed ? t('teacher.following') : t('teacher.follow')}
        variant={teacher.isFollowed ? 'outline' : 'secondary'}
        size="sm"
        onPress={onToggleFollow}
        accessibilityLabel={
          teacher.isFollowed
            ? t('teacher.unfollowA11y', { name: teacher.fullName })
            : t('teacher.followA11y', { name: teacher.fullName })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.screenPaddingX,
    paddingVertical: spacing.xl,
  },
  info: {
    flex: 1,
    minHeight: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  texts: { flex: 1 },
});

export const TeacherRow = memo(TeacherRowBase);
