import Feather from '@expo/vector-icons/Feather';
import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { useHover } from '@/components/layout/useHover';
import { pointerStyle } from '@/components/layout/work/workStyles';
import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, radius, spacing, useTheme } from '@/theme';

/**
 * `idle` waiting for a choice. After the answer is revealed: `correct` the right option, `wrong`
 * the option the user picked when it was wrong, `dim` every other option.
 */
export type QuizOptionState = 'idle' | 'correct' | 'wrong' | 'dim';

export type QuizOptionProps = {
  letter: string;
  text: string;
  state: QuizOptionState;
  /** True once the question is answered: options stop reacting to presses. */
  isLocked: boolean;
  onPress: () => void;
  testID?: string;
};

const LETTER_SIZE = 32;

/** One answer of a quiz question: lettered row; right = green + check, wrong = red + cross. */
function QuizOptionBase({ letter, text, state, isLocked, onPress, testID }: QuizOptionProps) {
  const { t } = useTranslation('ai');
  const { colors } = useTheme();
  const styles = useStyles();
  const { isHovered, hoverProps } = useHover();
  const rowStyle =
    state === 'correct' ? styles.correct : state === 'wrong' ? styles.wrong : styles.idle;
  return (
    <Pressable
      {...hoverProps}
      onPress={onPress}
      disabled={isLocked}
      accessibilityRole="button"
      accessibilityLabel={t('quiz.optionLabel', { letter, text })}
      accessibilityState={{
        disabled: isLocked,
        selected: state === 'correct' || state === 'wrong',
      }}
      testID={testID}
      style={({ pressed }) => [
        styles.row,
        rowStyle,
        state === 'dim' ? styles.dim : null,
        isHovered && !isLocked ? styles.hover : null,
        pressed && !isLocked ? styles.pressed : null,
        isLocked ? null : styles.clickable,
      ]}
    >
      <View style={styles.letter}>
        <AppText variant="label" color="textSecondary">
          {letter}
        </AppText>
      </View>
      <AppText variant="body" style={styles.text}>
        {text}
      </AppText>
      {state === 'correct' ? (
        <Feather name="check-circle" size={22} color={colors.success} />
      ) : state === 'wrong' ? (
        <Feather name="x-circle" size={22} color={colors.dangerText} />
      ) : null}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    minHeight: layout.minTouchTarget + spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1.5,
  },
  idle: { borderColor: t.colors.border, backgroundColor: t.colors.card },
  correct: { borderColor: t.colors.success, backgroundColor: t.colors.card },
  wrong: { borderColor: t.colors.danger, backgroundColor: t.colors.dangerSoft },
  dim: { opacity: 0.6 },
  hover: { borderColor: t.colors.primaryText },
  pressed: { backgroundColor: t.colors.surfaceAlt },
  clickable: pointerStyle,
  letter: {
    width: LETTER_SIZE,
    height: LETTER_SIZE,
    borderRadius: LETTER_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.surface,
  },
  text: { flex: 1 },
}));

export const QuizOption = memo(QuizOptionBase);
