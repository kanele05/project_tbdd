import { Image } from 'expo-image';
import { View } from 'react-native';

import { AppText, Avatar } from '@/components/ui';
import { layout, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { UserDto } from '@/types/api';

const COVER_HEIGHT = 128;
const AVATAR_SIZE = 96;
/** Design: the avatar's top edge sits 44 dp above the cover's bottom edge, with no white ring. */
const AVATAR_OVERLAP = 44;

type ProfileInfoProps = {
  user: Pick<UserDto, 'fullName' | 'headline' | 'avatarUrl' | 'coverUrl'> | null;
};

/** Cover image, avatar overlapping its bottom edge, full name and headline (SC-20). */
export function ProfileInfo({ user }: ProfileInfoProps) {
  const { colors } = useTheme();
  const styles = useStyles();
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
          <AppText variant="caption" align="center" numberOfLines={2}>
            {user.headline}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  cover: {
    height: COVER_HEIGHT,
    overflow: 'hidden',
    borderRadius: radius.card,
    backgroundColor: t.colors.surface,
  },
  coverImage: { width: '100%', height: '100%' },
  avatarWrap: { alignSelf: 'center', marginTop: -AVATAR_OVERLAP },
  texts: {
    alignItems: 'center',
    gap: spacing.xs,
    // Design: 14 dp between the avatar and the name line.
    marginTop: spacing.md + 2,
    paddingHorizontal: layout.screenPaddingX,
  },
}));
