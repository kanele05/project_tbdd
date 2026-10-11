import Feather from '@expo/vector-icons/Feather';
import { memo } from 'react';
import { View } from 'react-native';

import { PageContainer } from '@/components/layout/PageContainer';
import { AppText, Avatar, Badge, Button, GlassIconButton, HeroImage } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { makeStyles, spacing, useTheme, withAlpha } from '@/theme';
import type { TeacherDetail } from '@/types/api';

import { formatTeacherPlace, useNow } from '../../localTime';

export type TeacherHeroDesktopProps = {
  teacher: TeacherDetail;
  height: number;
  /** Hide the Follow button on the signed-in user's own teacher profile (BR-14). */
  isOwnProfile: boolean;
  onToggleFollow: () => void;
  onShare: () => void;
};

const AVATAR_SIZE = 128;
const NAME_SIZE = 44;
const NAME_LINE_HEIGHT = 52;

/**
 * Hero of the PC teacher profile (PLAN §2.5): the cover full-bleed under the transparent nav, with
 * the ringed avatar, serif name, "Teacher" badge, job title and "{place} - {local time}" bottom-left
 * and the Follow / Share actions bottom-right, all in white on the scrim.
 */
function TeacherHeroDesktopBase({
  teacher,
  height,
  isOwnProfile,
  onToggleFollow,
  onShare,
}: TeacherHeroDesktopProps) {
  const { t } = useTranslation('teacher');
  const { colors } = useTheme();
  const styles = useStyles();
  const now = useNow();
  const place = formatTeacherPlace(teacher.location, teacher.timezone, now);
  const softWhite = withAlpha(colors.white, 0.9);
  return (
    <HeroImage
      uri={teacher.coverUrl ?? teacher.avatarUrl}
      height={height}
      withTopInset={false}
      isRoundedBottom={false}
      contentStyle={styles.content}
      testID="teacher-hero"
    >
      <PageContainer style={styles.inner}>
        <Avatar uri={teacher.avatarUrl} name={teacher.fullName} size={AVATAR_SIZE} hasRing />
        <View style={styles.identity}>
          <View style={styles.nameRow}>
            <AppText
              variant="hero"
              color="white"
              numberOfLines={2}
              accessibilityRole="header"
              style={styles.name}
            >
              {teacher.fullName}
            </AppText>
            <Badge label={t('badge')} shape="pill" />
          </View>
          {teacher.jobTitle ? (
            <AppText variant="bodyLarge" style={{ color: softWhite }}>
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
        </View>
        <View style={styles.actions}>
          {isOwnProfile ? null : (
            <Button
              title={teacher.isFollowed ? t('following') : t('follow')}
              leftIcon={teacher.isFollowed ? 'user-check' : 'user-plus'}
              variant={teacher.isFollowed ? 'secondary' : 'primary'}
              onPress={onToggleFollow}
              accessibilityLabel={
                teacher.isFollowed
                  ? t('unfollowA11y', { name: teacher.fullName })
                  : t('followA11y', { name: teacher.fullName })
              }
              testID="teacher-follow-button"
            />
          )}
          <GlassIconButton
            icon="share-2"
            accessibilityLabel={t('share.button')}
            onPress={onShare}
          />
        </View>
      </PageContainer>
    </HeroImage>
  );
}

const useStyles = makeStyles(() => ({
  // HeroImage pads its content by the phone gutter: the PageContainer inside sets the PC margins.
  content: { paddingHorizontal: 0, paddingBottom: spacing.xxl },
  inner: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: spacing.xl },
  identity: { flex: 1, flexBasis: 320, minWidth: 0, gap: spacing.xs },
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md },
  name: { flexShrink: 1, fontSize: NAME_SIZE, lineHeight: NAME_LINE_HEIGHT },
  place: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
}));

export const TeacherHeroDesktop = memo(TeacherHeroDesktopBase);
