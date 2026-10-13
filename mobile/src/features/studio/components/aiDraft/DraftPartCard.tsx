import Feather from '@expo/vector-icons/Feather';
import { type ReactNode } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

import type { DraftPart } from './draftParts';

export type DraftPartCardProps = {
  title: string;
  part: DraftPart;
  /** Applied and not edited since: the button turns into a check. */
  applied: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
  /** No button at all (nothing to apply, e.g. no matching category). */
  hideApply?: boolean;
  /** Why the part cannot be applied (shown under the content). */
  hint?: string | null;
  onApply: (part: DraftPart) => void;
  children: ReactNode;
};

/** One suggestion of the AI draft: title, "Apply" button (or the applied check) and its content. */
export function DraftPartCard({
  title,
  part,
  applied,
  isDisabled = false,
  isLoading = false,
  hideApply = false,
  hint = null,
  onApply,
  children,
}: DraftPartCardProps) {
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
        ) : !hideApply ? (
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
        ) : null}
      </View>
      {children}
      {hint ? (
        <AppText variant="caption" color="textSecondary" testID={`ai-hint-${part}`}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
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
}));
