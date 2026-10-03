import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/ui';
import { colors, layout, radius, spacing } from '@/theme';

export type UploadBoxProps = { onPress: () => void };

/** Dashed "Upload your project here" box of the Projects tab -> opens SC-17. */
export function UploadBox({ onPress }: UploadBoxProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Upload your project here"
      style={({ pressed }) => [styles.box, pressed ? styles.pressed : null]}
    >
      <Ionicons name="cloud-upload-outline" size={36} color={colors.primary} />
      <AppText variant="body">Upload your project here</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    minHeight: layout.minTouchTarget + spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: radius.card,
    backgroundColor: colors.primaryLight,
  },
  pressed: { backgroundColor: colors.primaryTrack },
});
