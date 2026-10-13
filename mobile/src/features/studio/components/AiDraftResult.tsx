import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { TextField } from '@/components/ui/TextField';
import { useTranslation } from '@/i18n';
import { makeStyles, spacing } from '@/theme';
import type { AiCourseDraftDto } from '@/types/api';

import { STUDIO_LIMITS } from '../limits';
import { DraftPartCard } from './aiDraft/DraftPartCard';
import { ALL_PARTS, type DraftPart } from './aiDraft/draftParts';
import { OutlineEditor } from './aiDraft/OutlineEditor';
import { BenefitsEditor } from './BenefitsEditor';

export type AiDraftResultProps = {
  draft: AiCourseDraftDto;
  /** Which suggestions to show (default: all; "Help me write" shows the text ones). */
  parts?: readonly DraftPart[];
  /** Parts applied and not edited since (their button turns into a check). */
  applied: ReadonlySet<DraftPart>;
  /** Name of the suggested category, or `null` when none fits. */
  categoryName: string | null;
  /** Why a part cannot be applied (category / outline). */
  hints: Partial<Record<DraftPart, string>>;
  /** Can the part be applied right now? (it has content, and the course accepts it). */
  isApplicable: (part: DraftPart) => boolean;
  isApplyingOutline: boolean;
  /** Edit the draft; the edited part is no longer "applied". */
  onEdit: (part: DraftPart, patch: Partial<AiCourseDraftDto>) => void;
  onApply: (part: DraftPart) => void;
};

/**
 * The suggestions of an AI course draft. The teacher can edit each one before pressing its own
 * "Apply" (BR-29: nothing is saved by the AI).
 */
export function AiDraftResult({
  draft,
  parts = ALL_PARTS,
  applied,
  categoryName,
  hints,
  isApplicable,
  isApplyingOutline,
  onEdit,
  onApply,
}: AiDraftResultProps) {
  const { t } = useTranslation('studio');
  const styles = useStyles();
  const card = (part: DraftPart) => ({
    part,
    title: t(`ai.parts.${part}`),
    applied: applied.has(part),
    isDisabled: !isApplicable(part),
    hint: hints[part] ?? null,
    onApply,
  });
  return (
    <View style={styles.list} testID="ai-draft-result">
      <AppText variant="caption" color="textSecondary">
        {t('ai.editHint')}
      </AppText>
      {parts.includes('category') ? (
        <DraftPartCard {...card('category')} hideApply={!isApplicable('category')}>
          {categoryName ? (
            <AppText variant="body" testID="ai-category-name">
              {categoryName}
            </AppText>
          ) : null}
        </DraftPartCard>
      ) : null}
      {parts.includes('subtitle') ? (
        <DraftPartCard {...card('subtitle')}>
          <TextField
            value={draft.subtitle}
            onChangeText={(subtitle) => onEdit('subtitle', { subtitle })}
            accessibilityLabel={t('ai.parts.subtitle')}
            maxLength={STUDIO_LIMITS.subtitleMax}
            multiline
            textAlignVertical="top"
            helperText={t('ai.charCount', {
              count: draft.subtitle.length,
              max: STUDIO_LIMITS.subtitleMax,
            })}
          />
        </DraftPartCard>
      ) : null}
      {parts.includes('description') ? (
        <DraftPartCard {...card('description')}>
          <TextField
            value={draft.description}
            onChangeText={(description) => onEdit('description', { description })}
            accessibilityLabel={t('ai.parts.description')}
            maxLength={STUDIO_LIMITS.descriptionMax}
            multiline
            numberOfLines={7}
            textAlignVertical="top"
            helperText={t('ai.charCount', {
              count: draft.description.length,
              max: STUDIO_LIMITS.descriptionMax,
            })}
          />
        </DraftPartCard>
      ) : null}
      {parts.includes('benefits') ? (
        <DraftPartCard {...card('benefits')}>
          <BenefitsEditor
            value={draft.benefits}
            onChange={(benefits) => onEdit('benefits', { benefits })}
            hideLabel
          />
        </DraftPartCard>
      ) : null}
      {parts.includes('outline') ? (
        <DraftPartCard {...card('outline')} isLoading={isApplyingOutline}>
          <OutlineEditor
            sections={draft.sections}
            onChange={(sections) => onEdit('outline', { sections })}
          />
        </DraftPartCard>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(() => ({
  list: { gap: spacing.md },
}));
