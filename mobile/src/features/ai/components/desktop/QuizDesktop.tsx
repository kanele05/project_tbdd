import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';

import { PageContainer } from '@/components/layout/PageContainer';
import { WorkFrame, WorkHeader, WorkPanel } from '@/components/layout/work';
import { useTranslation } from '@/i18n';
import { makeStyles, spacing } from '@/theme';

import { AiBadge } from '../AiBadge';

/** Width of the quiz card: wide enough for a long question, narrow enough to read in one glance. */
export const QUIZ_CARD_WIDTH = 760;

export type QuizDesktopProps = {
  /** The AI-generated badge is shown once the questions exist. */
  hasQuiz: boolean;
  children: ReactNode;
};

/** Lesson quiz on a PC window: a "Back" link and a centered card (about 760 dp) with the question. */
export function QuizDesktop({ hasQuiz, children }: QuizDesktopProps) {
  const { t } = useTranslation('ai');
  const styles = useStyles();
  return (
    <WorkFrame testID="quiz-desktop">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator>
        <PageContainer maxWidth={QUIZ_CARD_WIDTH}>
          <WorkHeader hasBack title={t('quiz.headerTitle')} />
          <WorkPanel style={styles.card} testID="quiz-card">
            {hasQuiz ? <AiBadge style={styles.badge} /> : null}
            {children}
          </WorkPanel>
        </PageContainer>
      </ScrollView>
    </WorkFrame>
  );
}

const useStyles = makeStyles(() => ({
  content: { paddingTop: spacing.xxl, paddingBottom: spacing.huge },
  card: { gap: spacing.lg, padding: spacing.xxl },
  badge: { alignSelf: 'flex-start' },
}));
