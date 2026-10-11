import Feather from '@expo/vector-icons/Feather';
import { type ReactNode } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';
import type { AiCourseDraftDto } from '@/types/api';

export type DraftPart = 'subtitle' | 'description' | 'benefits' | 'outline';

export const ALL_PARTS: readonly DraftPart[] = ['subtitle', 'description', 'benefits', 'outline'];
/** Scope "text": only what the Intro step writes. */
export const TEXT_PARTS: readonly DraftPart[] = ['subtitle', 'description'];

export type AiDraftResultProps = {
  draft: AiCourseDraftDto;
  /** Which suggestions to show (default: all four; "Help me write" shows the text ones). */
  parts?: readonly DraftPart[];
  /** Parts already applied (their button turns into a check). */
  applied: ReadonlySet<DraftPart>;
  /** The outline can only be applied to an existing DRAFT / REJECTED course. */
  outlineHint: string | null;
  isApplyingOutline: boolean;
  onApply: (part: DraftPart) => void;
};

function PartCard({
  title,
  part,
  applied,
  isDisabled = false,
  isLoading = false,
  onApply,
  children,
}: {
  title: string;
  part: DraftPart;
  applied: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
  onApply: (part: DraftPart) => void;
  children: ReactNode;
}) {
  const { t } = useTranslation('studio');
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.card} testID={`ai-part-${part}`}>
      <View style={styles.cardHeader}>
        <AppText variant="label" family="bodySemiBold" style={styles.cardTitle}>
          {title}
        </AppText>
        {applied ? (
          <View style={styles.applied}>
            <Feather name="check" size={16} color={colors.success} />
            <AppText variant="caption" color="textSecondary">
              {t('ai.applied')}
            </AppText>
          </View>
        ) : (
          <Button
            title={t('ai.apply')}
            variant="outline"
            size="sm"
            disabled={isDisabled}
            loading={isLoading}
            onPress={() => onApply(part)}
            accessibilityLabel={t('ai.applyPart', { part: title })}
            testID={`ai-apply-${part}`}
          />
        )}
      </View>
      {children}
    </View>
  );
}

/** The four suggestions of an AI course draft, each with its own "Apply" (BR-29: nothing is saved). */
export function AiDraftResult({
  draft,
  parts = ALL_PARTS,
  applied,
  outlineHint,
  isApplyingOutline,
  onApply,
}: AiDraftResultProps) {
  const { t } = useTranslation('studio');
  const styles = useStyles();
  return (
    <View style={styles.list} testID="ai-draft-result">
      {parts.includes('subtitle') ? (
        <PartCard
          title={t('ai.parts.subtitle')}
          part="subtitle"
          applied={applied.has('subtitle')}
          onApply={onApply}
        >
          <AppText variant="body">{draft.subtitle}</AppText>
        </PartCard>
      ) : null}
      {parts.includes('description') ? (
        <PartCard
          title={t('ai.parts.description')}
          part="description"
          applied={applied.has('description')}
          onApply={onApply}
        >
          <AppText variant="body">{draft.description}</AppText>
        </PartCard>
      ) : null}
      {parts.includes('benefits') ? (
        <PartCard
          title={t('ai.parts.benefits')}
          part="benefits"
          applied={applied.has('benefits')}
          onApply={onApply}
        >
          {draft.benefits.map((benefit, index) => (
            <AppText key={index} variant="body">
              • {benefit}
            </AppText>
          ))}
        </PartCard>
      ) : null}
      {parts.includes('outline') ? (
        <PartCard
          title={t('ai.parts.outline')}
          part="outline"
          applied={applied.has('outline')}
          isDisabled={outlineHint !== null}
          isLoading={isApplyingOutline}
          onApply={onApply}
        >
          {draft.sections.map((section, index) => (
            <View key={index} style={styles.outlineSection}>
              <AppText variant="body" family="bodySemiBold">
                {index + 1}. {section.title}
              </AppText>
              {section.lessons.map((lesson, lessonIndex) => (
                <AppText key={lessonIndex} variant="caption">
                  – {lesson.title}
                </AppText>
              ))}
            </View>
          ))}
          {outlineHint ? (
            <AppText variant="caption" color="textSecondary">
              {outlineHint}
            </AppText>
          ) : null}
        </PartCard>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  list: { gap: spacing.md },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardTitle: { flex: 1 },
  applied: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  outlineSection: { gap: spacing.xxs },
}));
