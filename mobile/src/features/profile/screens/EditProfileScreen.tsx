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
import { FormError } from '@/features/auth/components/FormError';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, radius, spacing, useTheme } from '@/theme';

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
  const { t } = useTranslation(['profile', 'auth', 'common']);
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <ScreenHeader title={t('edit.title')} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => void pickAvatar()}
          disabled={isSaving}
          accessibilityRole="button"
          accessibilityLabel={t('edit.changePhoto')}
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
                {t('edit.uploadProgress', { percent: uploadProgress ?? 0 })}
              </AppText>
            </View>
          ) : null}
          <View style={styles.cameraBadge}>
            <Feather name="camera" size={16} color={colors.onPrimary} />
          </View>
        </Pressable>

        <View style={styles.form}>
          <FormTextField
            control={control}
            name="fullName"
            label={t('auth:fullName')}
            placeholder={t('auth:placeholders.fullName')}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            maxLength={60}
          />
          <FormTextField
            control={control}
            name="headline"
            label={t('edit.headline')}
            placeholder={t('edit.headlinePlaceholder')}
            returnKeyType="done"
            maxLength={80}
          />
          <TextField
            label={t('auth:email')}
            value={user?.email ?? ''}
            editable={false}
            helperText={t('edit.emailHelper')}
          />
          <FormError message={formError} />
          <Button
            title={t('common:actions.save')}
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

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
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
    backgroundColor: t.colors.secondarySoft,
  },
  progress: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: t.colors.overlay,
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
    borderColor: t.colors.background,
    backgroundColor: t.colors.primary,
  },
  form: { gap: spacing.lg },
}));
