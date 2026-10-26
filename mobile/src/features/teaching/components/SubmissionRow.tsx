import { memo } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing } from '@/theme';
import type { TeacherSubmissionDto } from '@/types/api';
import { formatRelativeTimeInline } from '@/utils/formatRelativeTime';

export type SubmissionRowProps = {
  submission: TeacherSubmissionDto;
  /** Keep these callbacks stable (`useCallback`) so `React.memo` can skip re-renders. */
  onGrade: (submission: TeacherSubmissionDto) => void;
  onOpenFile: (url: string) => void;
};

const AVATAR_SIZE = 40;

/** One student submission on SC-29: who, what, grade status, and the open-file / grade actions. */
function SubmissionRowBase({ submission, onGrade, onOpenFile }: SubmissionRowProps) {
  const { t } = useTranslation('teaching');
  const styles = useStyles();
  const isGraded = submission.grade !== null;
  const name = submission.user.fullName;

  return (
    <View style={styles.card} testID={`submission-${submission.id}`}>
      <View style={styles.header}>
        <Avatar uri={submission.user.avatarUrl} name={name} size={AVATAR_SIZE} />
        <View style={styles.author}>
          <AppText variant="label" numberOfLines={1}>
            {name}
          </AppText>
          <AppText variant="caption">
            {t('submissions.submittedAt', { time: formatRelativeTimeInline(submission.createdAt) })}
          </AppText>
        </View>
        <Badge
          tone={isGraded ? 'success' : 'gold'}
          shape="pill"
          label={
            isGraded
              ? t('submissions.gradeValue', { grade: submission.grade })
              : t('submissions.status.ungraded')
          }
        />
      </View>
      <AppText variant="title" numberOfLines={2}>
        {submission.title}
      </AppText>
      {submission.description ? (
        <AppText variant="body" color="textSecondary" numberOfLines={3}>
          {submission.description}
        </AppText>
      ) : null}
      {isGraded && submission.feedback ? (
        <View style={styles.feedback}>
          <AppText variant="caption" numberOfLines={3}>
            {submission.feedback}
          </AppText>
        </View>
      ) : null}
      <View style={styles.actions}>
        <Button
          title={t('submissions.openFile')}
          variant="ghost"
          size="sm"
          leftIcon="paperclip"
          onPress={() => onOpenFile(submission.fileUrl)}
        />
        {submission.imageUrl ? (
          <Button
            title={t('submissions.openImage')}
            variant="ghost"
            size="sm"
            leftIcon="image"
            onPress={() => onOpenFile(submission.imageUrl ?? '')}
          />
        ) : null}
        <Button
          title={isGraded ? t('submissions.regrade') : t('submissions.grade')}
          accessibilityLabel={t(isGraded ? 'submissions.regradeA11y' : 'submissions.gradeA11y', {
            title: submission.title,
            name,
          })}
          variant={isGraded ? 'outline' : 'primary'}
          size="sm"
          leftIcon="edit-3"
          onPress={() => onGrade(submission)}
          style={styles.gradeButton}
          testID={`grade-${submission.id}`}
        />
      </View>
    </View>
  );
}

/** Loading placeholder with the footprint of a submission row. */
export function SubmissionRowSkeleton() {
  const styles = useStyles();
  return (
    <View style={styles.card} testID="submission-skeleton">
      <View style={styles.header}>
        <Skeleton width={AVATAR_SIZE} height={AVATAR_SIZE} borderRadius={AVATAR_SIZE / 2} />
        <View style={styles.author}>
          <Skeleton width="50%" height={16} />
          <Skeleton width="30%" height={12} />
        </View>
      </View>
      <Skeleton width="70%" height={20} />
      <Skeleton height={14} />
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
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  author: { flex: 1, gap: spacing.xxs },
  feedback: {
    padding: spacing.md,
    borderRadius: radius.button,
    backgroundColor: t.colors.surfaceAlt,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  gradeButton: { marginLeft: 'auto' },
}));

export const SubmissionRow = memo(SubmissionRowBase);
