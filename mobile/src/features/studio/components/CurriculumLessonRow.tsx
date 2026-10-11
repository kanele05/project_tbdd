import Feather from '@expo/vector-icons/Feather';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';
import { formatLessonDuration } from '@/utils/formatDuration';

import type { EditableLesson } from '../curriculumModel';

export type CurriculumLessonRowProps = {
  lesson: EditableLesson;
  index: number;
  count: number;
  isBusy: boolean;
  onEdit: () => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
};

/** One lesson of the curriculum editor: title, length, preview flag and move / edit / delete. */
export function CurriculumLessonRow({
  lesson,
  index,
  count,
  isBusy,
  onEdit,
  onMove,
  onDelete,
}: CurriculumLessonRowProps) {
  const { t } = useTranslation('studio');
  const { colors } = useTheme();
  const styles = useStyles();
  const number = index + 1;
  return (
    <View style={styles.row} testID={`lesson-row-${lesson.key}`}>
      <View style={styles.text}>
        <AppText variant="body" family="bodyMedium" numberOfLines={2}>
          {number}. {lesson.title}
        </AppText>
        <View style={styles.meta}>
          <Feather name="clock" size={12} color={colors.textMuted} />
          <AppText variant="caption">{formatLessonDuration(lesson.durationSec)}</AppText>
          {lesson.isPreview ? (
            <View style={styles.previewTag}>
              <AppText variant="micro" color="primaryText" family="bodySemiBold">
                {t('lesson.previewTag')}
              </AppText>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.actions}>
        <IconButton
          icon="chevron-up"
          size={20}
          disabled={isBusy || index === 0}
          onPress={() => onMove(-1)}
          accessibilityLabel={t('lesson.moveUp', { title: lesson.title })}
        />
        <IconButton
          icon="chevron-down"
          size={20}
          disabled={isBusy || index === count - 1}
          onPress={() => onMove(1)}
          accessibilityLabel={t('lesson.moveDown', { title: lesson.title })}
        />
        <IconButton
          icon="edit-2"
          size={20}
          disabled={isBusy}
          onPress={onEdit}
          accessibilityLabel={t('lesson.edit', { title: lesson.title })}
          testID={`lesson-edit-${lesson.key}`}
        />
        <IconButton
          icon="trash-2"
          size={20}
          color="dangerText"
          disabled={isBusy}
          onPress={onDelete}
          accessibilityLabel={t('lesson.delete', { title: lesson.title })}
        />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.surfaceAlt,
  },
  text: { gap: spacing.xs },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  previewTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: t.colors.primarySoft,
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
}));
