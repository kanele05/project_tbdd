import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { colors, layout, radius, spacing } from '@/theme';
import type { TeacherDetail } from '@/types/api';

export type TeacherOverviewTabProps = {
  teacher: TeacherDetail;
  /** Hide the Follow button on the signed-in user's own teacher profile (BR-14). */
  isOwnProfile: boolean;
  onToggleFollow: () => void;
};

type Stat = { label: string; value: string };

const formatCount = (value: number): string => value.toLocaleString('en-US');

/** Four numbers of SC-18 Overview: Courses, Students, Rating, Followers. */
export function getTeacherStats(teacher: TeacherDetail): Stat[] {
  return [
    { label: 'Courses', value: formatCount(teacher.stats.courseCount) },
    { label: 'Students', value: formatCount(teacher.stats.studentCount) },
    { label: 'Rating', value: teacher.ratingAvg.toFixed(1) },
    { label: 'Followers', value: formatCount(teacher.stats.followerCount) },
  ];
}

/** SC-18 OVERVIEW tab: bio, statistics and the Follow / Following button (FR-20). */
function TeacherOverviewTabBase({
  teacher,
  isOwnProfile,
  onToggleFollow,
}: TeacherOverviewTabProps) {
  const stats = getTeacherStats(teacher);
  return (
    <View style={styles.container}>
      {teacher.bio ? (
        <AppText variant="bodyLarge" color="textSecondary">
          {teacher.bio}
        </AppText>
      ) : null}

      <View style={styles.stats} accessibilityRole="summary">
        {stats.map((stat, index) => (
          <View
            key={stat.label}
            style={[styles.stat, index > 0 ? styles.statDivider : null]}
            accessible
            accessibilityLabel={`${stat.label}: ${stat.value}`}
          >
            <AppText variant="h3" numberOfLines={1} adjustsFontSizeToFit>
              {stat.value}
            </AppText>
            <AppText variant="caption" numberOfLines={1}>
              {stat.label}
            </AppText>
          </View>
        ))}
      </View>

      {isOwnProfile ? null : (
        <Button
          title={teacher.isFollowed ? 'Following' : 'Follow'}
          leftIcon={teacher.isFollowed ? 'user-check' : 'user-plus'}
          variant="secondary"
          fullWidth
          onPress={onToggleFollow}
          accessibilityLabel={
            teacher.isFollowed
              ? `Following ${teacher.fullName}, tap to unfollow`
              : `Follow ${teacher.fullName}`
          }
          testID="teacher-follow-button"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xl,
    paddingHorizontal: layout.screenPaddingX,
    paddingVertical: spacing.xl,
  },
  stats: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
  },
  stat: { flex: 1, alignItems: 'center', gap: spacing.xxs, paddingVertical: spacing.md },
  statDivider: { borderLeftWidth: 1, borderLeftColor: colors.border },
});

export const TeacherOverviewTab = memo(TeacherOverviewTabBase);
