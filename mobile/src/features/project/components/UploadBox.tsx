import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, radius, spacing, useTheme } from '@/theme';

export type UploadBoxProps = { onPress: () => void };

/** Dashed "Upload your project here" box of the Projects tab -> opens SC-17. */
export function UploadBox({ onPress }: UploadBoxProps) {
  const { t } = useTranslation('project');
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('uploadHere')}
      style={({ pressed }) => [styles.box, pressed ? styles.pressed : null]}
    >
      <Ionicons name="cloud-upload-outline" size={32} color={colors.primaryText} />
      <AppText variant="label" color="primaryText">
        {t('uploadHere')}
      </AppText>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  box: {
    minHeight: layout.minTouchTarget + spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: t.colors.primaryText,
    borderRadius: radius.card,
    backgroundColor: t.colors.primarySoft,
  },
  pressed: { backgroundColor: t.colors.primaryTrack },
}));
