import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { WorkHeader, WorkShell } from '@/components/layout/work';
import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing } from '@/theme';

import { AvatarPicker } from '../components/AvatarPicker';
import { EditProfileForm } from '../components/EditProfileForm';
import { useEditProfile } from '../useEditProfile';

const FORM_MAX_WIDTH = 640;
const COVER_HEIGHT = 148;
const AVATAR_SIZE = 112;

/**
 * SC-21 Edit profile on a PC window (PLAN §2.5): a centred 640 dp card. The top shows the cover
 * (read only) with the avatar picker straddling its bottom edge - the preview of the new photo
 * updates at once - above the same form as on the phone.
 */
export function EditProfileDesktopScreen() {
  const edit = useEditProfile();
  const { user, avatarUri, uploadProgress, isUploadingAvatar, isSaving, pickAvatar } = edit;
  const { t } = useTranslation('profile');
  const styles = useStyles();

  return (
    <WorkShell maxWidth={FORM_MAX_WIDTH} testID="edit-profile-desktop">
      <WorkHeader title={t('edit.title')} hasBack />
      <View style={styles.card}>
        <View style={styles.cover} testID="edit-profile-cover">
          {user?.coverUrl ? (
            <Image
              source={{ uri: user.coverUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              cachePolicy="memory-disk"
              accessibilityIgnoresInvertColors
            />
          ) : null}
        </View>
        <View style={styles.avatar}>
          <AvatarPicker
            avatarUri={avatarUri}
            name={user?.fullName}
            size={AVATAR_SIZE}
            isSaving={isSaving}
            isUploading={isUploadingAvatar}
            uploadProgress={uploadProgress}
            onPick={() => void pickAvatar()}
          />
          <AppText variant="caption" align="center">
            {t('edit.photoHint')}
          </AppText>
        </View>
        <View style={styles.body}>
          <EditProfileForm edit={edit} />
        </View>
      </View>
    </WorkShell>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    overflow: 'hidden',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
  },
  cover: { height: COVER_HEIGHT, backgroundColor: t.colors.primarySoft },
  avatar: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: -(AVATAR_SIZE / 2),
    paddingHorizontal: spacing.xl,
  },
  body: { padding: spacing.xxl },
}));
