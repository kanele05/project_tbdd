import Feather from '@expo/vector-icons/Feather';
import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';
import type { CurriculumLesson, LessonStatus } from '@/types/api';
import { formatLessonDuration } from '@/utils/formatDuration';

export type LessonRowProps = {
  lesson: CurriculumLesson;
  /** The lesson being studied: highlighted with a `primarySoft` fill and an accent border. */
  isActive?: boolean;
  /** Keep this callback stable (`useCallback`) so `React.memo` can skip re-renders. */
  onPress: (lesson: CurriculumLesson) => void;
};

const STATUS_KEY = {
  COMPLETED: 'completed',
  IN_PROGRESS: 'inProgress',
  UNLOCKED: 'unlocked',
  LOCKED: 'locked',
} as const satisfies Record<LessonStatus, string>;

function formatNumber(value: number): string {
  return String(value).padStart(2, '0');
}

/** BR-02 icon: ✓ completed · ▶ in progress / active · ▷ unlocked · 🔒 locked. */
function StatusIcon({ status, isActive }: { status: LessonStatus; isActive: boolean }) {
  const { colors } = useTheme();
  if (status === 'COMPLETED') return <Feather name="check" size={20} color={colors.primaryText} />;
  if (status === 'LOCKED') return <Feather name="lock" size={16} color={colors.iconMuted} />;
  const isHighlighted = isActive || status === 'IN_PROGRESS';
  return (
    <Feather
      name="play"
      size={isHighlighted ? 20 : 18}
      color={isHighlighted ? colors.primaryText : colors.iconMuted}
    />
  );
}

/**
 * One lesson of the curriculum: "01 · title · 01:23 mins" + the status icon on the right.
 * Locked rows stay pressable (the parent answers with the "Enroll to unlock" toast).
 */
function LessonRowBase({ lesson, isActive = false, onPress }: LessonRowProps) {
  const { t } = useTranslation('learning');
  const styles = useStyles();
  const duration = formatLessonDuration(lesson.durationSec);
  const label = [
    t('lessonNumber', { number: lesson.number }),
    lesson.title,
    duration,
    t(`status.${STATUS_KEY[lesson.status]}`),
    lesson.isPreview && lesson.status !== 'LOCKED' ? t('preview') : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      onPress={() => onPress(lesson)}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isActive }}
      testID={`lesson-row-${lesson.id}`}
      style={({ pressed }) => [
        styles.row,
        isActive ? styles.active : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <AppText variant="body" color="textMuted" style={styles.number}>
        {formatNumber(lesson.number)}
      </AppText>
      <View style={styles.texts}>
        <AppText variant="body" numberOfLines={3}>
          {lesson.title}
        </AppText>
        <AppText variant="caption">{duration}</AppText>
      </View>
      <View style={styles.icon} testID={`lesson-status-${lesson.status}`}>
        <StatusIcon status={lesson.status} isActive={isActive} />
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.transparent,
  },
  active: { backgroundColor: t.colors.primarySoft, borderColor: t.colors.primaryText },
  pressed: { opacity: 0.7 },
  number: { minWidth: 24 },
  texts: { flex: 1, gap: spacing.xs },
  icon: { width: 24, alignItems: 'center' },
}));

export const LessonRow = memo(LessonRowBase);
