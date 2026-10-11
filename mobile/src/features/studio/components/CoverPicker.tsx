import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { showToast } from '@/components/ui/Toast';
import { useTranslation } from '@/i18n';
import { getErrorMessage, toAppError } from '@/lib/appError';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

import { toCoverFile, validateCoverImage } from '../coverImage';
import { useUploadCover } from '../hooks';

export type CoverPickerProps = {
  /** Current cover URL (`""` = none yet). */
  value: string;
  /** Called with the uploaded image URL. */
  onChange: (url: string) => void;
  disabled?: boolean;
  error?: string;
};

/**
 * Cover image field (FR-39): tap to pick a PNG / JPG (16:9 crop), it is uploaded at once
 * (`POST /teacher/uploads/image`) with a progress label, and the returned URL goes into the form.
 */
export function CoverPicker({ value, onChange, disabled = false, error }: CoverPickerProps) {
  const { t } = useTranslation('studio');
  const { colors } = useTheme();
  const styles = useStyles();
  const [progress, setProgress] = useState<number | null>(null);
  const upload = useUploadCover(setProgress);
  const isUploading = upload.isPending;

  const pick = useCallback(async () => {
    if (disabled || isUploading) return;
    try {
      // The system photo picker needs no runtime permission.
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      });
      const image = result.canceled ? undefined : result.assets[0];
      if (!image) return;
      const problem = validateCoverImage(image);
      if (problem) {
        showToast(problem, { type: 'error' });
        return;
      }
      const { url } = await upload.mutateAsync(toCoverFile(image));
      onChange(url);
    } catch (caught) {
      const code = toAppError(caught).code;
      const message =
        code === 'FILE_TOO_LARGE'
          ? t('cover.sizeError')
          : code === 'UNSUPPORTED_FILE_TYPE'
            ? t('cover.typeError')
            : getErrorMessage(caught);
      showToast(message, { type: 'error' });
    } finally {
      setProgress(null);
    }
  }, [disabled, isUploading, onChange, t, upload]);

  return (
    <View style={styles.wrap}>
      <AppText variant="label">{t('cover.label')}</AppText>
      <Pressable
        onPress={() => void pick()}
        disabled={disabled || isUploading}
        accessibilityRole="button"
        accessibilityLabel={value ? t('cover.change') : t('cover.choose')}
        accessibilityState={{ disabled: disabled || isUploading, busy: isUploading }}
        testID="cover-picker"
        style={[styles.frame, error ? styles.errored : null, disabled ? styles.disabled : null]}
      >
        {value ? (
          <Image
            source={{ uri: value }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={styles.placeholder}>
            <Feather name="image" size={32} color={colors.iconMuted} />
            <AppText variant="caption" align="center">
              {t('cover.empty')}
            </AppText>
          </View>
        )}
        {isUploading ? (
          <View style={styles.progress} testID="cover-progress">
            <ActivityIndicator color={colors.white} />
            <AppText variant="caption" color="white" family="bodyMedium">
              {t('cover.uploading', { percent: progress ?? 0 })}
            </AppText>
          </View>
        ) : null}
      </Pressable>
      {!disabled ? (
        <Button
          title={value ? t('cover.change') : t('cover.choose')}
          variant="secondary"
          size="sm"
          leftIcon="upload"
          onPress={() => void pick()}
          disabled={isUploading}
        />
      ) : null}
      <AppText variant="caption" color={error ? 'dangerText' : 'textMuted'}>
        {error ?? t('cover.hint')}
      </AppText>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { gap: spacing.sm },
  frame: {
    width: '100%',
    aspectRatio: 16 / 9,
    overflow: 'hidden',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  errored: { borderColor: t.colors.danger },
  disabled: { opacity: 0.7 },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  progress: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    backgroundColor: t.colors.overlay,
  },
}));
