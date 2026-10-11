import { KeyboardAvoidingView, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CinematicHeader } from '@/components/ui/CinematicHeader';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, spacing } from '@/theme';

import { AvatarPicker } from '../components/AvatarPicker';
import { EditProfileForm } from '../components/EditProfileForm';
import { useEditProfile } from '../useEditProfile';
import { EditProfileDesktopScreen } from './EditProfileDesktopScreen';

const AVATAR_SIZE = 96;

/**
 * SC-21 Edit profile (FR-22) on a phone: tap the avatar to pick a square-cropped photo, edit Full
 * name and Headline, email is read-only. Save uploads the photo (with progress) then PATCHes the profile.
 */
function EditProfilePhoneScreen() {
  const edit = useEditProfile();
  const { user, avatarUri, uploadProgress, isUploadingAvatar, isSaving, pickAvatar } = edit;
  const { t } = useTranslation('profile');
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <CinematicHeader
        title={t('edit.title')}
        uri={avatarUri ?? user?.avatarUrl}
        posterIndex={7}
        blur={24}
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AvatarPicker
          avatarUri={avatarUri}
          name={user?.fullName}
          size={AVATAR_SIZE}
          isSaving={isSaving}
          isUploading={isUploadingAvatar}
          uploadProgress={uploadProgress}
          onPick={() => void pickAvatar()}
        />
        <EditProfileForm edit={edit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** SC-21 Edit profile: the phone form below 768 dp, a centred form card from 768 dp (PLAN §2.5). */
export function EditProfileScreen() {
  const { isWide } = useBreakpoint();
  return isWide ? <EditProfileDesktopScreen /> : <EditProfilePhoneScreen />;
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  content: {
    paddingHorizontal: layout.screenPaddingX,
    paddingVertical: spacing.xl,
    gap: spacing.xxl,
  },
}));
