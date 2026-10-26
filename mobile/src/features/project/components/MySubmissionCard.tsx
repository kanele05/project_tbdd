import { memo } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing } from '@/theme';
import type { ProjectSubmissionDto } from '@/types/api';
import { formatRelativeTimeInline } from '@/utils/formatRelativeTime';

export type MySubmissionCardProps = { submission: ProjectSubmissionDto };

/**
 * The student's own submission with the instructor's result (BR-26): "85/100" badge, feedback and
 * grading date, or "Waiting for the instructor" while it is not graded.
 */
function MySubmissionCardBase({ submission }: MySubmissionCardProps) {
  const { t } = useTranslation('project');
  const styles = useStyles();
  const { grade, feedback, gradedAt } = submission;
  const isGraded = grade !== null;
  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={
        isGraded
          ? t('mine.a11yGraded', { title: submission.title, grade })
          : t('mine.a11yWaiting', { title: submission.title })
      }
      testID={`my-submission-${submission.id}`}
    >
      <View style={styles.header}>
        <AppText variant="title" numberOfLines={2} style={styles.title}>
          {submission.title}
        </AppText>
        <Badge
          tone={isGraded ? 'success' : 'gold'}
          shape="pill"
          label={isGraded ? t('mine.grade', { grade }) : t('mine.waiting')}
        />
      </View>
      {isGraded && feedback ? (
        <View style={styles.feedback}>
          <AppText variant="label">{t('mine.feedback')}</AppText>
          <AppText variant="body" color="textSecondary">
            {feedback}
          </AppText>
          {gradedAt ? (
            <AppText variant="caption">
              {t('mine.gradedAt', { time: formatRelativeTimeInline(gradedAt) })}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  title: { flex: 1 },
  feedback: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.button,
    backgroundColor: t.colors.surfaceAlt,
  },
}));

export const MySubmissionCard = memo(MySubmissionCardBase);
