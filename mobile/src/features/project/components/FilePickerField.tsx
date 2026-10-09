import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import { AppText, IconButton } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, radius, spacing, useTheme } from '@/theme';

import type { PickedFile } from '../api';
import { formatFileSize } from '../fileUtils';

export type FilePickerFieldProps = {
  label: string;
  /** Shown under the box while there is no error, e.g. "PNG, JPG, PDF or ZIP - max 10 MB". */
  hint: string;
  file: PickedFile | null;
  error?: string | null;
  /** Shows an image preview instead of the file icon (cover image). */
  showPreview?: boolean;
  onPick: () => void;
  onClear: () => void;
  disabled?: boolean;
  testID?: string;
};

/**
 * A labeled "choose a file" box. Empty: dashed box with an upload icon. Filled: file name, size and
 * a remove button (with a thumbnail for images).
 */
export function FilePickerField({
  label,
  hint,
  file,
  error,
  showPreview = false,
  onPick,
  onClear,
  disabled = false,
  testID,
}: FilePickerFieldProps) {
  const { t } = useTranslation('project');
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.container}>
      <AppText variant="label">{label}</AppText>
      {file ? (
        <View style={styles.selected} testID={testID}>
          {showPreview ? (
            <Image
              source={{ uri: file.uri }}
              style={styles.thumb}
              contentFit="cover"
              cachePolicy="memory-disk"
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={styles.fileIcon}>
              <Feather name="file" size={20} color={colors.primaryText} />
            </View>
          )}
          <View style={styles.fileTexts}>
            <AppText variant="body" numberOfLines={1}>
              {file.name}
            </AppText>
            {file.size != null ? (
              <AppText variant="caption">{formatFileSize(file.size)}</AppText>
            ) : null}
          </View>
          <IconButton
            icon="x"
            size={20}
            color="textSecondary"
            onPress={onClear}
            disabled={disabled}
            accessibilityLabel={t('submit.removeFile', { name: file.name })}
          />
        </View>
      ) : (
        <Pressable
          onPress={onPick}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={t('submit.chooseLabel', { label: label.toLowerCase() })}
          style={({ pressed }) => [styles.empty, pressed ? styles.pressed : null]}
          testID={testID}
        >
          <Ionicons name="cloud-upload-outline" size={28} color={colors.primaryText} />
          <AppText variant="label" color="primaryText">
            {t('submit.chooseFile')}
          </AppText>
        </Pressable>
      )}
      {error ? (
        <AppText variant="caption" color="dangerText" accessibilityRole="alert">
          {error}
        </AppText>
      ) : (
        <AppText variant="caption">{hint}</AppText>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: { gap: spacing.sm },
  empty: {
    minHeight: layout.minTouchTarget + spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: t.colors.primaryText,
    borderRadius: radius.card,
    backgroundColor: t.colors.primarySoft,
  },
  pressed: { backgroundColor: t.colors.primaryTrack },
  selected: {
    minHeight: layout.minTouchTarget + spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: radius.card,
    backgroundColor: t.colors.card,
  },
  thumb: { width: 48, height: 48, borderRadius: radius.button, backgroundColor: t.colors.surface },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.primarySoft,
  },
  fileTexts: { flex: 1 },
}));
