import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { FormTextField } from '@/components/ui/FormTextField';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TextField } from '@/components/ui/TextField';
import { STRINGS } from '@/constants/strings';
import { FormError } from '@/features/auth/components/FormError';
import { colors, layout, radius, spacing } from '@/theme';

import { useEditProfile } from '../useEditProfile';

const AVATAR_SIZE = 96;

/**
 * SC-21 Edit profile (FR-22): tap the avatar to pick a square-cropped photo, edit Full name and
 * Headline, email is read-only. Save uploads the photo (with progress) then PATCHes the profile.
 */
export function EditProfileScreen() {
  const {
    control,
    user,
    avatarUri,
    uploadProgress,
    isUploadingAvatar,
    isSaving,
    hasChanges,
    formError,
    pickAvatar,
    save,
  } = useEditProfile();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <ScreenHeader title="Edit profile" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => void pickAvatar()}
          disabled={isSaving}
          accessibilityRole="button"
          accessibilityLabel="Change profile photo"
          style={styles.avatarButton}
        >
          {avatarUri ? (
            <View style={styles.avatarCircle}>
              <Image
                source={{ uri: avatarUri }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                cachePolicy="memory-disk"
                accessibilityIgnoresInvertColors
              />
            </View>
          ) : (
            <Avatar name={user?.fullName} size={AVATAR_SIZE} />
          )}
          {isUploadingAvatar ? (
            <View style={styles.progress} testID="avatar-progress">
              <ActivityIndicator color={colors.white} />
              <AppText variant="caption" color="white" family="bodyMedium">
                {uploadProgress ?? 0}%
              </AppText>
            </View>
          ) : null}
          <View style={styles.cameraBadge}>
            <Feather name="camera" size={16} color={colors.textOnPrimary} />
          </View>
        </Pressable>

        <View style={styles.form}>
          <FormTextField
            control={control}
            name="fullName"
            label={STRINGS.auth.fullName}
            placeholder="Your full name"
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            maxLength={60}
          />
          <FormTextField
            control={control}
            name="headline"
            label="Headline"
            placeholder="e.g. UX/UI Designer"
            returnKeyType="done"
            maxLength={80}
          />
          <TextField
            label={STRINGS.auth.email}
            value={user?.email ?? ''}
            editable={false}
            helperText="Your email can't be changed."
          />
          <FormError message={formError} />
          <Button
            title={STRINGS.common.save}
            onPress={() => void save()}
            loading={isSaving}
            disabled={!hasChanges}
            fullWidth
            testID="edit-profile-save"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: layout.screenPaddingX,
    paddingVertical: spacing.xl,
    gap: spacing.xxl,
  },
  avatarButton: { alignSelf: 'center', width: AVATAR_SIZE, height: AVATAR_SIZE },
  avatarCircle: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    overflow: 'hidden',
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.secondaryLight,
  },
  progress: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.overlay,
  },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.background,
    backgroundColor: colors.primary,
  },
  form: { gap: spacing.lg },
});
