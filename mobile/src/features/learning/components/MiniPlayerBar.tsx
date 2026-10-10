import Feather from '@expo/vector-icons/Feather';
import { memo } from 'react';
import { Pressable } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, spacing, useTheme } from '@/theme';

export type MiniPlayerBarProps = {
  /** Lesson title shown next to the icon. */
  title?: string;
  onExpand: () => void;
};

/**
 * One 48 dp row that stands in for the video while the keyboard is open on the Q&A / Projects tab
 * (the video itself stays mounted, only hidden, so playback is not lost). Tap = show the video again.
 */
function MiniPlayerBarBase({ title, onExpand }: MiniPlayerBarProps) {
  const { t } = useTranslation('learning');
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <Pressable
      onPress={onExpand}
      accessibilityRole="button"
      accessibilityLabel={t('showVideo')}
      accessibilityHint={title}
      style={styles.bar}
      testID="mini-player-bar"
    >
      <Feather name="play-circle" size={20} color={colors.primaryText} />
      <AppText variant="label" numberOfLines={1} style={styles.title}>
        {title ?? t('showVideo')}
      </AppText>
      <AppText variant="caption" color="primaryText" family="bodySemiBold">
        {t('showVideo')}
      </AppText>
      <Feather name="chevron-down" size={20} color={colors.primaryText} />
    </Pressable>
  );
}

export const MiniPlayerBar = memo(MiniPlayerBarBase);

const useStyles = makeStyles((t) => ({
  bar: {
    minHeight: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: layout.screenPaddingX,
    backgroundColor: t.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  title: { flex: 1 },
}));
