import { memo, type ReactNode } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing } from '@/theme';
import type { AdminDiffLessonContentDto, AdminRevisionDiffDto, FieldChangeDto } from '@/types/api';
import { formatLessonDuration } from '@/utils/formatDuration';
import { formatPrice, formatPriceOrFree } from '@/utils/formatPrice';

import { BeforeAfter, DiffRow } from './DiffRow';

export type RevisionDiffViewProps = { diff: AdminRevisionDiffDto };

type LessonChange = AdminRevisionDiffDto['curriculum']['lessonsChanged'][number];
type ChangedField = LessonChange['changedFields'][number];

function useChangedFieldText() {
  const { t } = useTranslation('admin');
  return (field: ChangedField, content: AdminDiffLessonContentDto): string => {
    switch (field) {
      case 'title':
        return content.title;
      case 'videoUrl':
        return content.videoUrl;
      case 'durationSec':
        return formatLessonDuration(content.durationSec);
      case 'isPreview':
        return content.isPreview ? t('diff.yes') : t('diff.no');
      case 'content':
        return content.content.trim() ? t('diff.notesText') : t('diff.notesEmpty');
    }
  };
}

function LessonChangeDetails({ change }: { change: LessonChange }) {
  const styles = useStyles();
  const { t } = useTranslation('admin');
  const fieldText = useChangedFieldText();
  return (
    <>
      <AppText variant="caption" color="textSecondary">
        {change.after.title} · {change.sectionTitle}
      </AppText>
      {change.changedFields.map((field) => (
        <View key={field} style={styles.fieldBlock}>
          <AppText variant="caption" color="textSecondary" family="bodySemiBold">
            {t(`diff.fields.${field}`)}
          </AppText>
          <BeforeAfter
            beforeLabel={t('diff.before')}
            afterLabel={t('diff.after')}
            before={fieldText(field, change.before)}
            after={fieldText(field, change.after)}
          />
        </View>
      ))}
    </>
  );
}

/** Comparison of the live course with its pending revision (SC-33): changed fields and curriculum edits. */
function RevisionDiffViewBase({ diff }: RevisionDiffViewProps) {
  const { t } = useTranslation('admin');
  const styles = useStyles();
  const { curriculum } = diff;
  const beforeLabel = t('diff.before');
  const afterLabel = t('diff.after');

  const field = <T,>(
    key: string,
    label: string,
    change: FieldChangeDto<T> | null,
    format: (value: T) => string,
  ): ReactNode =>
    change ? (
      <DiffRow key={key} kind="changed" label={label} testID={`diff-${key}`}>
        <BeforeAfter
          beforeLabel={beforeLabel}
          afterLabel={afterLabel}
          before={format(change.before)}
          after={format(change.after)}
        />
      </DiffRow>
    ) : null;

  const optionalPrice = (cents: number | null): string =>
    cents === null ? t('diff.none') : formatPrice(cents);

  return (
    <View style={styles.card} testID="revision-diff">
      {!diff.hasChanges ? (
        <AppText variant="body" color="textSecondary" style={styles.empty}>
          {t('diff.noChanges')}
        </AppText>
      ) : null}

      {field('title', t('diff.fields.title'), diff.title, (value) => value)}
      {field('price', t('diff.fields.price'), diff.priceCents, formatPriceOrFree)}
      {field(
        'originalPrice',
        t('diff.fields.originalPrice'),
        diff.originalPriceCents,
        optionalPrice,
      )}
      {field('category', t('diff.fields.category'), diff.category, (value) => value.name)}
      {field('tags', t('diff.fields.tags'), diff.tags, (value) =>
        value.length > 0 ? value.map((tag) => tag.name).join(', ') : t('diff.none'),
      )}

      {curriculum.sectionsAdded.map((title) => (
        <DiffRow key={`sa-${title}`} kind="added" label={t('diff.sectionAdded')}>
          <AppText variant="body">{title}</AppText>
        </DiffRow>
      ))}
      {curriculum.sectionsRemoved.map((title) => (
        <DiffRow key={`sr-${title}`} kind="removed" label={t('diff.sectionRemoved')}>
          <AppText variant="body">{title}</AppText>
        </DiffRow>
      ))}
      {curriculum.sectionsRenamed.map((change) => (
        <DiffRow
          key={`sn-${change.before}-${change.after}`}
          kind="changed"
          label={t('diff.sectionRenamed')}
        >
          <BeforeAfter
            beforeLabel={beforeLabel}
            afterLabel={afterLabel}
            before={change.before}
            after={change.after}
          />
        </DiffRow>
      ))}
      {curriculum.lessonsAdded.map((lesson, index) => (
        <DiffRow key={`la-${lesson.id ?? index}`} kind="added" label={t('diff.lessonAdded')}>
          <AppText variant="body">{lesson.title}</AppText>
          <AppText variant="caption" color="textSecondary">
            {lesson.sectionTitle} · {formatLessonDuration(lesson.durationSec)}
          </AppText>
        </DiffRow>
      ))}
      {curriculum.lessonsRemoved.map((lesson) => (
        <DiffRow key={`lr-${lesson.id}`} kind="removed" label={t('diff.lessonRemoved')}>
          <AppText variant="body">{lesson.title}</AppText>
          <AppText variant="caption" color="textSecondary">
            {lesson.sectionTitle} · {formatLessonDuration(lesson.durationSec)}
          </AppText>
          {lesson.progressCount > 0 ? (
            <AppText variant="caption" color="dangerText" family="bodySemiBold">
              {t('diff.progressLost', { count: lesson.progressCount })}
            </AppText>
          ) : null}
        </DiffRow>
      ))}
      {curriculum.lessonsChanged.map((change) => (
        <DiffRow key={`lc-${change.id}`} kind="changed" label={t('diff.lessonChanged')}>
          <LessonChangeDetails change={change} />
        </DiffRow>
      ))}
      {curriculum.isReordered ? (
        <DiffRow kind="info" label={t('diff.reordered')}>
          <AppText variant="caption" color="textSecondary">
            {t('diff.reorderedHint')}
          </AppText>
        </DiffRow>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
    overflow: 'hidden',
  },
  empty: { padding: spacing.lg },
  fieldBlock: { gap: spacing.xs },
}));

export const RevisionDiffView = memo(RevisionDiffViewBase);
