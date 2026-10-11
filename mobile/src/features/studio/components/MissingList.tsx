import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';
import type { CourseMissingItemDto } from '@/types/api';

import { describeMissing, getMissingTarget } from '../missingItems';

export type MissingListProps = {
  courseId: string;
  items: readonly CourseMissingItemDto[];
};

function openTarget(courseId: string, item: CourseMissingItemDto): void {
  const pathname =
    getMissingTarget(item.code) === 'curriculum' ? '/studio/[id]/curriculum' : '/studio/[id]/edit';
  router.push({ pathname, params: { id: courseId } });
}

/**
 * "What is still missing" checklist (BR-20). Each row is a readable sentence in the current
 * language and opens the screen where it is fixed (course info or curriculum).
 */
export function MissingList({ courseId, items }: MissingListProps) {
  const { t } = useTranslation('studio');
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.list} testID="missing-list">
      {items.map((item, index) => {
        const text = describeMissing(item);
        return (
          <Pressable
            key={`${item.code}-${item.lessonNumber ?? index}`}
            onPress={() => openTarget(courseId, item)}
            accessibilityRole="button"
            accessibilityLabel={t('status.fixMissing', { item: text })}
            style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
          >
            <Feather name="alert-circle" size={18} color={colors.dangerText} />
            <AppText variant="body" style={styles.text}>
              {text}
            </AppText>
            <Feather name="chevron-right" size={18} color={colors.textMuted} />
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  list: { gap: spacing.xs },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.button,
    backgroundColor: t.colors.dangerSoft,
  },
  pressed: { opacity: 0.7 },
  text: { flex: 1 },
}));
