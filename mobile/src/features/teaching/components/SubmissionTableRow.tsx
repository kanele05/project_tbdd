import { memo } from 'react';
import { View } from 'react-native';

import { TableCell, TableRow, type TableColumn } from '@/components/layout/work';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { useTranslation } from '@/i18n';
import { makeStyles, spacing } from '@/theme';
import type { TeacherSubmissionDto } from '@/types/api';
import { formatRelativeTimeInline } from '@/utils/formatRelativeTime';

/** Columns of the submissions table; `submitted` is dropped on tablets. */
export type SubmissionColumns = {
  student: TableColumn;
  project: TableColumn;
  submitted?: TableColumn;
  grade: TableColumn;
  actions: TableColumn;
};

export type SubmissionTableRowProps = {
  submission: TeacherSubmissionDto;
  columns: SubmissionColumns;
  isLast: boolean;
  /** Keep these callbacks stable (`useCallback`) so `React.memo` can skip re-renders. */
  onGrade: (submission: TeacherSubmissionDto) => void;
  onOpenFile: (url: string) => void;
};

const AVATAR_SIZE = 36;

/**
 * One submission as a table row (SC-29, PC): student, project (title, description, feedback once
 * graded), submitted time, grade badge and the open-file / grade actions.
 */
function SubmissionTableRowBase({
  submission,
  columns,
  isLast,
  onGrade,
  onOpenFile,
}: SubmissionTableRowProps) {
  const { t } = useTranslation('teaching');
  const styles = useStyles();
  const isGraded = submission.grade !== null;
  const name = submission.user.fullName;
  const submittedAt = t('submissions.submittedAt', {
    time: formatRelativeTimeInline(submission.createdAt),
  });
  return (
    <TableRow isLast={isLast} testID={`submission-${submission.id}`}>
      <TableCell column={columns.student}>
        <View style={styles.student}>
          <Avatar uri={submission.user.avatarUrl} name={name} size={AVATAR_SIZE} />
          <View style={styles.studentText}>
            <AppText variant="label" numberOfLines={2}>
              {name}
            </AppText>
            {columns.submitted ? null : <AppText variant="caption">{submittedAt}</AppText>}
          </View>
        </View>
      </TableCell>
      <TableCell column={columns.project}>
        <AppText variant="cardTitle" numberOfLines={2}>
          {submission.title}
        </AppText>
        {submission.description ? (
          <AppText variant="caption" color="textSecondary" numberOfLines={2}>
            {submission.description}
          </AppText>
        ) : null}
        {isGraded && submission.feedback ? (
          <AppText variant="caption" numberOfLines={2}>
            {submission.feedback}
          </AppText>
        ) : null}
      </TableCell>
      {columns.submitted ? (
        <TableCell column={columns.submitted}>
          <AppText variant="caption">{submittedAt}</AppText>
        </TableCell>
      ) : null}
      <TableCell column={columns.grade}>
        <Badge
          tone={isGraded ? 'success' : 'gold'}
          shape="pill"
          label={
            isGraded
              ? t('submissions.gradeValue', { grade: submission.grade })
              : t('submissions.status.ungraded')
          }
        />
      </TableCell>
      <TableCell column={columns.actions}>
        <View style={styles.actions}>
          <IconButton
            icon="paperclip"
            size={20}
            containerSize={40}
            accessibilityLabel={t('submissions.openFile')}
            onPress={() => onOpenFile(submission.fileUrl)}
          />
          {submission.imageUrl ? (
            <IconButton
              icon="image"
              size={20}
              containerSize={40}
              accessibilityLabel={t('submissions.openImage')}
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
            testID={`grade-${submission.id}`}
          />
        </View>
      </TableCell>
    </TableRow>
  );
}

export const SubmissionTableRow = memo(SubmissionTableRowBase);

const useStyles = makeStyles(() => ({
  student: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  studentText: { flex: 1, minWidth: 0, gap: spacing.xxs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
}));
