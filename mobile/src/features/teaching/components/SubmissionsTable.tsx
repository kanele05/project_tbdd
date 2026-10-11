import { useMemo } from 'react';

import { TableCard, TableHeaderRow, type TableColumn } from '@/components/layout/work';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslation } from '@/i18n';
import type { TeacherSubmissionDto } from '@/types/api';

import { SubmissionTableRow, type SubmissionColumns } from './SubmissionTableRow';

export type SubmissionsTableProps = {
  items: readonly TeacherSubmissionDto[];
  /** Keep these callbacks stable (`useCallback`) so the memoized rows can skip re-renders. */
  onGrade: (submission: TeacherSubmissionDto) => void;
  onOpenFile: (url: string) => void;
};

/** Submissions of a course as a table (SC-29, PC): student, project, submitted, grade, actions. */
export function SubmissionsTable({ items, onGrade, onOpenFile }: SubmissionsTableProps) {
  const { t } = useTranslation('teaching');
  const { isDesktop } = useBreakpoint();
  const columns = useMemo<SubmissionColumns>(
    () => ({
      student: { key: 'student', label: t('submissions.columns.student'), flex: 1.2 },
      project: { key: 'project', label: t('submissions.columns.project'), flex: 2.4 },
      submitted: isDesktop
        ? { key: 'submitted', label: t('submissions.columns.submitted'), width: 130 }
        : undefined,
      grade: { key: 'grade', label: t('submissions.columns.grade'), width: 100 },
      actions: { key: 'actions', label: t('submissions.columns.actions'), width: 200 },
    }),
    [isDesktop, t],
  );
  const headerColumns = useMemo(
    () => Object.values(columns).filter((column): column is TableColumn => column !== undefined),
    [columns],
  );
  return (
    <TableCard testID="submissions-list">
      <TableHeaderRow columns={headerColumns} />
      {items.map((submission, index) => (
        <SubmissionTableRow
          key={submission.id}
          submission={submission}
          columns={columns}
          isLast={index === items.length - 1}
          onGrade={onGrade}
          onOpenFile={onOpenFile}
        />
      ))}
    </TableCard>
  );
}
