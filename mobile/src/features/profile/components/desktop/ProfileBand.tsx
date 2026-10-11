import { memo } from 'react';
import { View } from 'react-native';

import { PageContainer } from '@/components/layout/PageContainer';
import { AppText, Avatar, Badge, Button, HeroImage } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { makeStyles, spacing, withAlpha } from '@/theme';
import type { MeStatsDto, UserDto } from '@/types/api';

import { ProfileStatsDesktop } from './ProfileStatsDesktop';

export type ProfileBandProps = {
  user: Pick<UserDto, 'fullName' | 'headline' | 'avatarUrl' | 'coverUrl' | 'role'> | null;
  stats: MeStatsDto | undefined;
  isStatsLoading: boolean;
  onEdit: () => void;
  onPressOngoing: () => void;
  onPressCompleted: () => void;
};

const BAND_HEIGHT = 300;
const AVATAR_SIZE = 120;

/**
 * Header of the PC profile: the cover as a full-bleed band (a dark gradient when there is none),
 * the ringed avatar, serif name, headline and the three counters, all in white on the scrim.
 */
function ProfileBandBase({
  user,
  stats,
  isStatsLoading,
  onEdit,
  onPressOngoing,
  onPressCompleted,
}: ProfileBandProps) {
  const { t } = useTranslation(['profile', 'teacher']);
  const styles = useStyles();
  return (
    <HeroImage
      uri={user?.coverUrl}
      height={BAND_HEIGHT}
      withTopInset={false}
      isRoundedBottom={false}
      contentStyle={styles.content}
      testID="profile-band"
    >
      <PageContainer style={styles.inner}>
        <Avatar uri={user?.avatarUrl} name={user?.fullName} size={AVATAR_SIZE} hasRing />
        <View style={styles.identity}>
          <View style={styles.nameRow}>
            <AppText
              variant="h1"
              color="white"
              numberOfLines={2}
              accessibilityRole="header"
              style={styles.name}
            >
              {user?.fullName ?? ''}
            </AppText>
            {user?.role === 'TEACHER' ? <Badge label={t('teacher:badge')} /> : null}
          </View>
          {user?.headline ? (
            <AppText variant="body" numberOfLines={2} style={styles.headline}>
              {user.headline}
            </AppText>
          ) : null}
          <Button
            title={t('profile:menu.editProfile')}
            variant="secondary"
            size="sm"
            leftIcon="edit-2"
            onPress={onEdit}
            style={styles.edit}
            testID="profile-edit-button"
          />
        </View>
        <ProfileStatsDesktop
          stats={stats}
          isLoading={isStatsLoading}
          onPressOngoing={onPressOngoing}
          onPressCompleted={onPressCompleted}
        />
      </PageContainer>
    </HeroImage>
  );
}

const useStyles = makeStyles((t) => ({
  // HeroImage pads its content by the phone gutter: the PageContainer inside sets the PC margins.
  content: { paddingHorizontal: 0, paddingBottom: spacing.xxl },
  inner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: spacing.xl,
  },
  identity: { flex: 1, flexBasis: 280, minWidth: 0, gap: spacing.xs },
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  name: { flexShrink: 1 },
  headline: { color: withAlpha(t.colors.white, 0.9) },
  edit: { alignSelf: 'flex-start', marginTop: spacing.sm },
}));

export const ProfileBand = memo(ProfileBandBase);
