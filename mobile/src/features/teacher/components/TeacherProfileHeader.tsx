import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Avatar, Badge, Button, GlassIconButton, HeroImage } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { formatNumber } from '@/i18n/format';
import { layout, makeStyles, spacing, useTheme, withAlpha } from '@/theme';
import type { TeacherDetail } from '@/types/api';

import { formatTeacherPlace, useNow } from '../localTime';

export type TeacherProfileHeaderProps = {
  teacher: TeacherDetail;
  /** Hide the Follow button on the signed-in user's own teacher profile (BR-14). */
  isOwnProfile: boolean;
  onToggleFollow: () => void;
  onShare: () => void;
};

const HERO_HEIGHT = 400;
const AVATAR_SIZE = 88;

type Stat = { key: string; label: string; value: string };

function goBack(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/**
 * Top of SC-18 (concept B): the cover as a full-bleed hero with glass back / share buttons, the
 * ringed avatar, serif name, job title and "{location} - {local time}" in white on the scrim; below
 * it the four numbers (Courses, Students, Rating, Followers) and the Follow button (BR-14).
 */
function TeacherProfileHeaderBase({
  teacher,
  isOwnProfile,
  onToggleFollow,
  onShare,
}: TeacherProfileHeaderProps) {
  const { t } = useTranslation(['teacher', 'common']);
  const { colors } = useTheme();
  const themed = useStyles();
  const now = useNow();
  const place = formatTeacherPlace(teacher.location, teacher.timezone, now);
  const softWhite = withAlpha(colors.white, 0.88);
  const stats: Stat[] = [
    { key: 'courses', label: t('stats.courses'), value: formatNumber(teacher.stats.courseCount) },
    {
      key: 'students',
      label: t('stats.students'),
      value: formatNumber(teacher.stats.studentCount),
    },
    {
      key: 'rating',
      label: t('stats.rating'),
      value: formatNumber(teacher.ratingAvg, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
    },
    {
      key: 'followers',
      label: t('stats.followers'),
      value: formatNumber(teacher.stats.followerCount),
    },
  ];

  return (
    <View>
      <HeroImage
        uri={teacher.coverUrl ?? teacher.avatarUrl}
        height={HERO_HEIGHT}
        testID="teacher-hero"
        top={
          <>
            <GlassIconButton
              icon="chevron-left"
              accessibilityLabel={t('common:actions.back')}
              onPress={goBack}
            />
            <GlassIconButton
              icon="share-2"
              accessibilityLabel={t('share.button')}
              onPress={onShare}
            />
          </>
        }
      >
        <Avatar uri={teacher.avatarUrl} name={teacher.fullName} size={AVATAR_SIZE} hasRing />
        <View style={styles.nameRow}>
          <AppText variant="h1" color="white" accessibilityRole="header" style={styles.name}>
            {teacher.fullName}
          </AppText>
          <Badge label={t('badge')} shape="pill" />
        </View>
        {teacher.jobTitle ? (
          <AppText variant="body" style={{ color: softWhite }}>
            {teacher.jobTitle}
          </AppText>
        ) : null}
        {place ? (
          <View style={styles.place} accessible accessibilityLabel={t('locationA11y', { place })}>
            <Feather name="map-pin" size={14} color={softWhite} />
            <AppText variant="caption" style={{ color: softWhite }}>
              {place}
            </AppText>
          </View>
        ) : null}
      </HeroImage>

      <View style={themed.stats} accessibilityRole="summary">
        {stats.map((stat, index) => (
          <View
            key={stat.key}
            style={[styles.stat, index > 0 ? themed.divider : null]}
            accessible
            accessibilityLabel={t('stats.a11y', { label: stat.label, value: stat.value })}
          >
            <AppText variant="h2" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {stat.value}
            </AppText>
            <AppText variant="caption" align="center" numberOfLines={2}>
              {stat.label}
            </AppText>
          </View>
        ))}
      </View>

      {isOwnProfile ? null : (
        <View style={styles.follow}>
          <Button
            title={teacher.isFollowed ? t('following') : t('follow')}
            leftIcon={teacher.isFollowed ? 'user-check' : 'user-plus'}
            variant={teacher.isFollowed ? 'outline' : 'primary'}
            fullWidth
            onPress={onToggleFollow}
            accessibilityLabel={
              teacher.isFollowed
                ? t('unfollowA11y', { name: teacher.fullName })
                : t('followA11y', { name: teacher.fullName })
            }
            testID="teacher-follow-button"
          />
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  stats: {
    flexDirection: 'row',
    marginHorizontal: layout.screenPaddingX,
    marginTop: spacing.xl,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: t.colors.border,
  },
  divider: { borderLeftWidth: 1, borderLeftColor: t.colors.border },
}));

const styles = StyleSheet.create({
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  name: { flexShrink: 1 },
  place: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  stat: { flex: 1, alignItems: 'center', gap: spacing.xxs, paddingVertical: spacing.md },
  follow: { paddingHorizontal: layout.screenPaddingX, paddingTop: spacing.xl },
});

export const TeacherProfileHeader = memo(TeacherProfileHeaderBase);
