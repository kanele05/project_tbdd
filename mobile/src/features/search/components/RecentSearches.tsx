import Feather from '@expo/vector-icons/Feather';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, IconButton } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { layout, spacing, useTheme } from '@/theme';

type RecentSearchesProps = {
  keywords: readonly string[];
  onPressKeyword: (keyword: string) => void;
  onRemoveKeyword: (keyword: string) => void;
};

type RowProps = {
  keyword: string;
  onPress: (keyword: string) => void;
  onRemove: (keyword: string) => void;
};

const Row = memo(function Row({ keyword, onPress, onRemove }: RowProps) {
  const { t } = useTranslation('search');
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => onPress(keyword)}
        accessibilityRole="button"
        accessibilityLabel={keyword}
        style={({ pressed }) => [styles.keyword, pressed ? styles.pressed : null]}
      >
        <Feather name="clock" size={18} color={colors.iconMuted} />
        <AppText variant="body" numberOfLines={1} style={styles.text}>
          {keyword}
        </AppText>
      </Pressable>
      <IconButton
        icon="x"
        size={18}
        color="textMuted"
        accessibilityLabel={t('recent.remove', { keyword })}
        onPress={() => onRemove(keyword)}
      />
    </View>
  );
});

/** The newest recent searches as 48 dp rows: tap to search again, "x" to forget one. */
export function RecentSearches({ keywords, onPressKeyword, onRemoveKeyword }: RecentSearchesProps) {
  return (
    <View>
      {keywords.map((keyword) => (
        <Row key={keyword} keyword={keyword} onPress={onPressKeyword} onRemove={onRemoveKeyword} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  keyword: {
    flex: 1,
    minHeight: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pressed: { opacity: 0.7 },
  text: { flex: 1 },
});
