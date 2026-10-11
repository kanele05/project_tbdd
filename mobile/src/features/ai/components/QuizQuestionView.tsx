import Feather from '@expo/vector-icons/Feather';
import { Platform, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';
import type { AiQuizQuestionDto } from '@/types/api';

import { useQuizKeys } from '../quizKeys';
import { optionLetter } from '../quizSession';
import { QuizOption, type QuizOptionState } from './QuizOption';

export type QuizQuestionViewProps = {
  question: AiQuizQuestionDto;
  /** 0-based position and total, for "Question 2 of 5" and the progress bar. */
  index: number;
  total: number;
  /** The option chosen so far (`null` = not answered). */
  selected: number | null;
  onSelect: (optionIndex: number) => void;
  onNext: () => void;
};

function stateOf(question: AiQuizQuestionDto, selected: number | null, option: number) {
  if (selected === null) return 'idle' as const;
  if (option === question.correctIndex) return 'correct' as const;
  return option === selected ? ('wrong' as const) : ('dim' as const);
}

/** One question: progress, the four options and - once answered - the verdict and explanation. */
export function QuizQuestionView({
  question,
  index,
  total,
  selected,
  onSelect,
  onNext,
}: QuizQuestionViewProps) {
  const { t } = useTranslation('ai');
  const { colors } = useTheme();
  const styles = useStyles();
  const { isWide } = useBreakpoint();
  const isAnswered = selected !== null;
  const isCorrect = selected === question.correctIndex;
  const isLast = index + 1 >= total;
  useQuizKeys({ optionCount: question.options.length, isAnswered, onSelect, onNext });
  const percent = ((index + (isAnswered ? 1 : 0)) / total) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.progress}>
        <AppText variant="caption" color="textSecondary" accessibilityLiveRegion="polite">
          {t('quiz.progress', { current: index + 1, total })}
        </AppText>
        <ProgressBar percent={percent} />
      </View>
      <AppText variant="h3" accessibilityRole="header" testID="quiz-question">
        {question.question}
      </AppText>
      <View style={styles.options}>
        {question.options.map((option, optionIndex) => {
          const state: QuizOptionState = stateOf(question, selected, optionIndex);
          return (
            <QuizOption
              key={`${index}-${optionIndex}`}
              letter={optionLetter(optionIndex)}
              text={option}
              state={state}
              isLocked={isAnswered}
              onPress={() => onSelect(optionIndex)}
              testID={`quiz-option-${optionIndex}`}
            />
          );
        })}
      </View>
      {isWide && Platform.OS === 'web' ? (
        <AppText variant="caption" testID="quiz-key-hint">
          {t('quiz.keyHint')}
        </AppText>
      ) : null}
      {isAnswered ? (
        <View style={styles.feedback} accessibilityLiveRegion="polite" testID="quiz-feedback">
          <View style={styles.verdict}>
            <Feather
              name={isCorrect ? 'check-circle' : 'x-circle'}
              size={20}
              color={isCorrect ? colors.success : colors.dangerText}
            />
            <AppText variant="title" color={isCorrect ? 'text' : 'dangerText'}>
              {isCorrect ? t('quiz.correct') : t('quiz.incorrect')}
            </AppText>
          </View>
          {isCorrect ? null : (
            <AppText variant="body">
              {t('quiz.rightAnswer', {
                answer: `${optionLetter(question.correctIndex)}. ${question.options[question.correctIndex] ?? ''}`,
              })}
            </AppText>
          )}
          <AppText variant="caption" color="textSecondary" family="bodySemiBold">
            {t('quiz.explanation')}
          </AppText>
          <AppText variant="body" color="textSecondary">
            {question.explanation}
          </AppText>
          <Button
            title={isLast ? t('quiz.finish') : t('quiz.next')}
            rightIcon="arrow-right"
            onPress={onNext}
            fullWidth
            testID="quiz-next"
          />
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: { gap: spacing.lg },
  progress: { gap: spacing.sm },
  options: { gap: spacing.md },
  feedback: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.card,
  },
  verdict: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
}));
