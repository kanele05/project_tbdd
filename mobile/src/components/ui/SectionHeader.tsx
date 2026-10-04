import Feather from '@expo/vector-icons/Feather';
import { memo } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTranslation } from '@/i18n';
import { spacing, useTheme } from '@/theme';

import { AppText } from './AppText';

export type SectionHeaderProps = {
  title: string;
  /** When provided, a "View more →" link is shown on the right. */
  onViewMore?: () => void;
  /** Default: the translated "View more". */
  viewMoreLabel?: string;
  /** Link size: `sm` = 13 dp (default, most sections), `md` = 15 dp. */
  viewMoreSize?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
};

/** Section title (Playfair serif, 22 dp) on the left, optional accent "View more →" link on the right. */
function SectionHeaderBase({
  title,
  onViewMore,
  viewMoreLabel,
  viewMoreSize = 'sm',
  style,
}: SectionHeaderProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const linkLabel = viewMoreLabel ?? t('actions.viewMore');
  return (
    <View style={[styles.row, style]}>
      <AppText variant="h2" accessibilityRole="header" numberOfLines={2} style={styles.title}>
        {title}
      </AppText>
      {onViewMore ? (
        <Pressable
          onPress={onViewMore}
          hitSlop={{ top: 8, bottom: 8 }}
          accessibilityRole="link"
          accessibilityLabel={`${linkLabel}, ${title}`}
          style={styles.link}
        >
          <AppText
            variant={viewMoreSize === 'md' ? 'body' : 'caption'}
            family="bodySemiBold"
            color="primaryText"
          >
            {linkLabel}
          </AppText>
          <Feather name="arrow-right" size={16} color={colors.primaryText} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
    gap: spacing.md,
  },
  title: { flexShrink: 1 },
  link: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    justifyContent: 'flex-end',
  },
});

export const SectionHeader = memo(SectionHeaderBase);
