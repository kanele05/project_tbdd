import Feather from '@expo/vector-icons/Feather';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, radius, spacing } from '@/theme';
import type { CurriculumLesson, LessonStatus } from '@/types/api';
import { formatLessonDuration } from '@/utils/formatDuration';

export type LessonRowProps = {
  lesson: CurriculumLesson;
  /** The lesson being studied: highlighted with a `primaryLight` fill and a primary border. */
  isActive?: boolean;
  /** Keep this callback stable (`useCallback`) so `React.memo` can skip re-renders. */
  onPress: (lesson: CurriculumLesson) => void;
};

const STATUS_LABEL: Record<LessonStatus, string> = {
  COMPLETED: 'completed',
  IN_PROGRESS: 'in progress',
  UNLOCKED: 'unlocked',
  LOCKED: 'locked',
};

function formatNumber(value: number): string {
  return String(value).padStart(2, '0');
}

/** BR-02 icon: ✓ completed · ▶ in progress / active · ▷ unlocked · 🔒 locked. */
function StatusIcon({ status, isActive }: { status: LessonStatus; isActive: boolean }) {
  if (status === 'COMPLETED') return <Feather name="check" size={20} color={colors.primary} />;
  if (status === 'LOCKED') return <Feather name="lock" size={16} color={colors.iconMuted} />;
  const isHighlighted = isActive || status === 'IN_PROGRESS';
  return (
    <Feather
      name="play"
      size={isHighlighted ? 20 : 18}
      color={isHighlighted ? colors.primary : colors.iconMuted}
    />
  );
}

/**
 * One lesson of the curriculum: "01 · title · 01:23 mins" + the status icon on the right.
 * Locked rows stay pressable (the parent answers with the "Enroll to unlock" toast).
 */
function LessonRowBase({ lesson, isActive = false, onPress }: LessonRowProps) {
  const label = [
    `Lesson ${lesson.number}`,
    lesson.title,
    formatLessonDuration(lesson.durationSec),
    STATUS_LABEL[lesson.status],
    lesson.isPreview && lesson.status !== 'LOCKED' ? 'preview' : null,
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
      <AppText variant="body" style={styles.number}>
        {formatNumber(lesson.number)}
      </AppText>
      <View style={styles.texts}>
        <AppText variant="body" numberOfLines={3}>
          {lesson.title}
        </AppText>
        <AppText variant="caption">{formatLessonDuration(lesson.durationSec)}</AppText>
      </View>
      <View style={styles.icon} testID={`lesson-status-${lesson.status}`}>
        <StatusIcon status={lesson.status} isActive={isActive} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Design: a 58 dp row (1 border + 8 padding + title 20 + 4 + duration 16), title at x = 56.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.transparent,
  },
  active: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  pressed: { opacity: 0.7 },
  number: { minWidth: 20 },
  texts: { flex: 1, gap: spacing.xs },
  icon: { width: 24, alignItems: 'center' },
});

export const LessonRow = memo(LessonRowBase);
