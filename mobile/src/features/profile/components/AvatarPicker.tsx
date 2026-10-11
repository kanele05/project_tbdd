import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

export type AvatarPickerProps = {
  /** Picked photo or the current avatar; the initials show when there is none. */
  avatarUri: string | null;
  name?: string;
  size?: number;
  isSaving: boolean;
  isUploading: boolean;
  /** Upload progress 0-100 while `isUploading`. */
  uploadProgress: number | null;
  onPick: () => void;
};

/** Round avatar with a camera badge: press to choose a new photo, a progress veil while it uploads. */
export function AvatarPicker({
  avatarUri,
  name,
  size = 96,
  isSaving,
  isUploading,
  uploadProgress,
  onPick,
}: AvatarPickerProps) {
  const { t } = useTranslation('profile');
  const { colors } = useTheme();
  const styles = useStyles();
  const round = { width: size, height: size, borderRadius: size / 2 };
  return (
    <Pressable
      onPress={onPick}
      disabled={isSaving}
      accessibilityRole="button"
      accessibilityLabel={t('edit.changePhoto')}
      style={[styles.button, { width: size, height: size }]}
      testID="avatar-picker"
    >
      {avatarUri ? (
        <View style={[styles.circle, round]}>
          <Image
            source={{ uri: avatarUri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            accessibilityIgnoresInvertColors
          />
        </View>
      ) : (
        <Avatar name={name} size={size} />
      )}
      {isUploading ? (
        <View style={[styles.progress, round]} testID="avatar-progress">
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
  );
}

const useStyles = makeStyles((t) => ({
  button: { alignSelf: 'center' },
  circle: { overflow: 'hidden', backgroundColor: t.colors.secondarySoft },
  progress: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
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
}));
