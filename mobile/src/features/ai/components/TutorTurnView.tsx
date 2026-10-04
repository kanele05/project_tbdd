import Feather from '@expo/vector-icons/Feather';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

import type { TutorTurn } from '../useAiTutorChat';
import { ChatBubble } from './ChatBubble';

export type TutorTurnViewProps = {
  turn: TutorTurn;
  /** Seconds left of a rate limit: "Send again" waits for it. */
  cooldownSec: number;
  onRetry: () => void;
};

/**
 * The exchange that is not in the saved history yet: the question, the answer as it types, and -
 * when the request failed or was cut off - a red note with "Send again". A cut-off answer keeps
 * the text that did arrive.
 */
export function TutorTurnView({ turn, cooldownSec, onRetry }: TutorTurnViewProps) {
  const { t } = useTranslation('ai');
  const { colors } = useTheme();
  const styles = useStyles();
  const isStreaming = turn.status === 'streaming';
  const hasAnswer = turn.answer !== '';

  return (
    <View style={styles.container} testID="tutor-turn">
      <ChatBubble role="user" text={turn.question} />
      {isStreaming || hasAnswer ? (
        <ChatBubble role="assistant" text={turn.answer} isStreaming={isStreaming} />
      ) : null}
      {turn.status === 'error' && turn.error ? (
        <View style={styles.note} accessibilityRole="alert" testID="tutor-error">
          <Feather name="alert-circle" size={18} color={colors.dangerText} />
          <View style={styles.noteBody}>
            <AppText variant="body" color="dangerText">
              {turn.error.message}
            </AppText>
            {hasAnswer && turn.error.message !== t('tutor.interrupted') ? (
              <AppText variant="caption" color="textSecondary">
                {t('tutor.interrupted')}
              </AppText>
            ) : null}
            <Button
              title={
                cooldownSec > 0 ? t('tutor.retryIn', { seconds: cooldownSec }) : t('tutor.resend')
              }
              variant="secondary"
              size="sm"
              leftIcon="refresh-cw"
              disabled={cooldownSec > 0}
              onPress={onRetry}
              testID="tutor-resend"
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** Aligns the note with the assistant bubble: the 28 dp orb plus its gap. */
const ORB_OFFSET = 28 + spacing.sm;

const useStyles = makeStyles((t) => ({
  container: { gap: spacing.md },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginLeft: ORB_OFFSET,
    padding: spacing.md,
    borderRadius: radius.card,
    backgroundColor: t.colors.dangerSoft,
  },
  noteBody: { flex: 1, gap: spacing.sm, alignItems: 'flex-start' },
}));
