import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { AppText, Avatar } from '@/components/ui';
import { colors, layout, radius, spacing } from '@/theme';
import type { UserDto } from '@/types/api';

const COVER_HEIGHT = 128;
const AVATAR_SIZE = 96;
const AVATAR_BORDER = 4;

type ProfileInfoProps = {
  user: Pick<UserDto, 'fullName' | 'headline' | 'avatarUrl' | 'coverUrl'> | null;
};

/** Cover image, avatar overlapping its bottom edge, full name and headline (SC-20). */
export function ProfileInfo({ user }: ProfileInfoProps) {
  return (
    <View>
      <View style={styles.cover}>
        {user?.coverUrl ? (
          <Image
            source={{ uri: user.coverUrl }}
            style={styles.coverImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
            accessibilityIgnoresInvertColors
          />
        ) : null}
      </View>
      <View style={styles.avatarWrap}>
        <Avatar
          uri={user?.avatarUrl}
          name={user?.fullName}
          size={AVATAR_SIZE}
          backgroundColor={colors.primaryTrack}
        />
      </View>
      <View style={styles.texts}>
        <AppText variant="h3" align="center" numberOfLines={2} accessibilityRole="header">
          {user?.fullName ?? ''}
        </AppText>
        {user?.headline ? (
          <AppText variant="body" color="textMuted" align="center" numberOfLines={2}>
            {user.headline}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    height: COVER_HEIGHT,
    overflow: 'hidden',
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  coverImage: { width: '100%', height: '100%' },
  avatarWrap: {
    alignSelf: 'center',
    marginTop: -(AVATAR_SIZE / 2),
    padding: AVATAR_BORDER,
    borderRadius: (AVATAR_SIZE + 2 * AVATAR_BORDER) / 2,
    backgroundColor: colors.background,
  },
  texts: {
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingHorizontal: layout.screenPaddingX,
  },
});
