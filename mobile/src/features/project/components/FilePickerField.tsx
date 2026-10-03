import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, IconButton } from '@/components/ui';
import { colors, layout, radius, spacing } from '@/theme';

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
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={styles.fileIcon}>
              <Feather name="file" size={20} color={colors.primary} />
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
            accessibilityLabel={`Remove ${file.name}`}
          />
        </View>
      ) : (
        <Pressable
          onPress={onPick}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`Choose ${label.toLowerCase()}`}
          style={({ pressed }) => [styles.empty, pressed ? styles.pressed : null]}
          testID={testID}
        >
          <Ionicons name="cloud-upload-outline" size={28} color={colors.primary} />
          <AppText variant="body" color="primaryText" family="bodyMedium">
            Choose file
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

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  empty: {
    minHeight: layout.minTouchTarget + spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: radius.card,
    backgroundColor: colors.primaryLight,
  },
  pressed: { backgroundColor: colors.primaryTrack },
  selected: {
    minHeight: layout.minTouchTarget + spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    backgroundColor: colors.background,
  },
  thumb: { width: 48, height: 48, borderRadius: radius.button, backgroundColor: colors.surface },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  fileTexts: { flex: 1 },
});
