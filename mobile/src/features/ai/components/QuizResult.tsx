import Feather from '@expo/vector-icons/Feather';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';
import type { AiQuizQuestionDto } from '@/types/api';

import { getScore, getScoreTier } from '../quizSession';

export type QuizResultProps = {
  questions: readonly AiQuizQuestionDto[];
  answers: readonly (number | null)[];
  onRetake: () => void;
  onBack: () => void;
};

/** End of the quiz: the score in big serif type, a message for the tier, the per-question review. */
export function QuizResult({ questions, answers, onRetake, onBack }: QuizResultProps) {
  const { t } = useTranslation('ai');
  const { colors } = useTheme();
  const styles = useStyles();
  const total = questions.length;
  const score = getScore(questions, answers);

  return (
    <View style={styles.container} testID="quiz-result">
      <View style={styles.scoreBlock}>
        <AppText variant="caption" color="textSecondary" accessibilityRole="header">
          {t('quiz.resultTitle')}
        </AppText>
        <AppText
          variant="hero"
          color="primaryText"
          accessibilityLabel={t('quiz.scoreLabel', { score, total })}
          testID="quiz-score"
        >
          {t('quiz.score', { score, total })}
        </AppText>
        <AppText variant="bodyLarge" color="textSecondary" align="center">
          {t(`quiz.message.${getScoreTier(score, total)}`)}
        </AppText>
      </View>
      <AppText variant="title" accessibilityRole="header">
        {t('quiz.review')}
      </AppText>
      <View style={styles.review}>
        {questions.map((question, index) => {
          const isCorrect = answers[index] === question.correctIndex;
          return (
            <View key={index} style={styles.reviewRow}>
              <Feather
                name={isCorrect ? 'check-circle' : 'x-circle'}
                size={20}
                color={isCorrect ? colors.success : colors.dangerText}
              />
              <AppText variant="body" style={styles.reviewText} numberOfLines={3}>
                {question.question}
              </AppText>
            </View>
          );
        })}
      </View>
      <View style={styles.actions}>
        <Button title={t('quiz.backToLesson')} onPress={onBack} fullWidth testID="quiz-back" />
        <Button
          title={t('quiz.retake')}
          variant="outline"
          leftIcon="rotate-ccw"
          onPress={onRetake}
          fullWidth
          testID="quiz-retake"
        />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: { gap: spacing.lg },
  scoreBlock: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  review: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.card,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  reviewText: { flex: 1 },
  actions: { gap: spacing.md },
}));
