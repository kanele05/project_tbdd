import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AiCard, AppText, Button, Skeleton } from '@/components/ui';
import { SparklesIcon } from '@/components/ui/SparklesIcon';
import { useAiCourseSummary } from '@/features/ai/hooks';
import { useTranslation } from '@/i18n';
import { getErrorMessage, toAppError } from '@/lib/appError';
import { spacing, useTheme } from '@/theme';
import type { AiCourseSummaryDto } from '@/types/api';

import { AiSummaryContent } from './AiSummaryContent';

export type CourseAiSummaryProps = {
  courseId: string;
  /** The user asked for the summary (button or the AI button of the bottom bar). */
  isRequested: boolean;
  onRequest: () => void;
};

function SummaryLoading() {
  const { t } = useTranslation('course');
  return (
    <View
      style={styles.loading}
      accessible
      accessibilityLabel={t('ai.generating')}
      accessibilityState={{ busy: true }}
      testID="ai-summary-loading"
    >
      <Skeleton width="100%" height={14} />
      <Skeleton width="92%" height={14} />
      <Skeleton width="76%" height={14} />
      <Skeleton width="40%" height={14} />
    </View>
  );
}

function getRetryAfterSec(error: unknown): number | null {
  const details = toAppError(error).details;
  if (typeof details !== 'object' || details === null || !('retryAfterSec' in details)) return null;
  const seconds = Number((details as { retryAfterSec: unknown }).retryAfterSec);
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : null;
}

type SummaryErrorProps = { error: unknown; onRetry: () => void };

/** 429 `AI_RATE_LIMITED` / 503 `AI_UNAVAILABLE` / 422 `AI_BLOCKED`: friendly text + Retry. */
function SummaryError({ error, onRetry }: SummaryErrorProps) {
  const { t } = useTranslation(['course', 'common']);
  const retryAfter = getRetryAfterSec(error);
  return (
    <View style={styles.error} accessibilityRole="alert" testID="ai-summary-error">
      <AppText variant="body" color="dangerText">
        {getErrorMessage(error)}
      </AppText>
      {retryAfter ? (
        <AppText variant="caption">{t('course:ai.retryAfter', { seconds: retryAfter })}</AppText>
      ) : null}
      <Button
        title={t('common:actions.retry')}
        variant="outline"
        size="sm"
        leftIcon="refresh-cw"
        onPress={onRetry}
      />
    </View>
  );
}

function isEmptySummary(data: AiCourseSummaryDto): boolean {
  return (
    data.overview.trim() === '' &&
    data.objectives.length === 0 &&
    data.sections.length === 0 &&
    data.outcomes.length === 0
  );
}

/**
 * AI course summary block of the Overview tab (AI-03). It is loaded only when the user asks for it:
 * a Gemini call costs free-tier quota and most visitors just browse. Once loaded the answer stays
 * in the query cache (and in the DB on the server), so it shows instantly on later visits.
 */
function CourseAiSummaryBase({ courseId, isRequested, onRequest }: CourseAiSummaryProps) {
  const { t } = useTranslation('course');
  const { colors } = useTheme();
  const { data, isError, error, isFetching, refetch } = useAiCourseSummary(courseId, isRequested);

  let body;
  if (data) {
    body = isEmptySummary(data) ? (
      <AppText variant="body" color="textSecondary">
        {t('ai.empty')}
      </AppText>
    ) : (
      <AiSummaryContent summary={data} />
    );
  } else if (isError) {
    body = <SummaryError error={error} onRetry={() => void refetch()} />;
  } else if (isRequested || isFetching) {
    body = <SummaryLoading />;
  } else {
    body = (
      <Button
        title={t('ai.generate')}
        variant="outline"
        leftAdornment={<SparklesIcon size={18} color={colors.primaryText} />}
        onPress={onRequest}
        testID="ai-summary-button"
      />
    );
  }

  return (
    <AiCard title={t('ai.title')} subtitle={t('ai.subtitle')} variant="panel">
      {body}
    </AiCard>
  );
}

const styles = StyleSheet.create({
  loading: { gap: spacing.sm },
  error: { gap: spacing.sm, alignItems: 'flex-start' },
});

export const CourseAiSummary = memo(CourseAiSummaryBase);
