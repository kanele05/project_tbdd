import { View } from 'react-native';

import { AiCard } from '@/components/ui/AiCard';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { describeAiError } from '@/features/ai/aiErrors';
import { useTranslation } from '@/i18n';
import { useLanguage } from '@/i18n/useLanguage';
import { makeStyles, radius, spacing } from '@/theme';
import type { AiCourseReviewDto } from '@/types/api';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

import { SEVERITY_TONE } from '../adminMeta';
import { useAdminAiReview } from '../hooks';

export type AiReviewPanelProps = {
  courseId: string;
  /** The admin has asked for the check (starts the Gemini call). */
  isRequested: boolean;
  onRequest: () => void;
};

function ReviewResult({ review }: { review: AiCourseReviewDto }) {
  const { t } = useTranslation('admin');
  const styles = useStyles();
  const isOk = review.verdict === 'LOOKS_OK';
  return (
    <View style={styles.result} testID="ai-review-result">
      <Badge
        label={isOk ? t('ai.verdict.LOOKS_OK') : t('ai.verdict.NEEDS_ATTENTION')}
        tone={isOk ? 'success' : 'gold'}
        shape="pill"
      />
      <AppText variant="body">{review.summary}</AppText>
      {review.issues.length === 0 ? (
        <AppText variant="caption" color="textSecondary">
          {t('ai.noIssues')}
        </AppText>
      ) : (
        <View style={styles.issues}>
          <AppText variant="label">{t('ai.issuesTitle', { count: review.issues.length })}</AppText>
          {review.issues.map((issue, index) => (
            <View key={`${issue.area}-${index}`} style={styles.issue} testID="ai-issue">
              <View style={styles.issueHead}>
                <Badge
                  label={t(`ai.severity.${issue.severity}`)}
                  tone={SEVERITY_TONE[issue.severity]}
                  shape="pill"
                />
                <AppText variant="caption" color="textSecondary" family="bodySemiBold">
                  {issue.area}
                </AppText>
              </View>
              <AppText variant="body">{issue.message}</AppText>
            </View>
          ))}
        </View>
      )}
      <AppText variant="caption" color="textMuted">
        {t('ai.generatedAt', { when: formatRelativeTime(review.generatedAt), model: review.model })}
      </AppText>
    </View>
  );
}

/**
 * AI pre-review panel (FR-51, BR-29): Gemini reads the submitted content and lists possible
 * problems. Runs on demand, is advisory only and its failure never blocks approve / reject.
 */
export function AiReviewPanel({ courseId, isRequested, onRequest }: AiReviewPanelProps) {
  const { t } = useTranslation('admin');
  const { language } = useLanguage();
  const styles = useStyles();
  const query = useAdminAiReview(courseId, language, isRequested);

  let content;
  if (!isRequested) {
    content = (
      <Button title={t('ai.run')} leftIcon="zap" onPress={onRequest} testID="ai-review-run" />
    );
  } else if (query.isPending) {
    content = (
      <View
        style={styles.loading}
        accessibilityState={{ busy: true }}
        accessibilityLabel={t('ai.loading')}
      >
        <Skeleton height={28} width={140} borderRadius={radius.pill} />
        <Skeleton height={18} />
        <Skeleton height={18} width="80%" />
        <AppText variant="caption" color="textSecondary">
          {t('ai.loading')}
        </AppText>
      </View>
    );
  } else if (query.isError) {
    const info = describeAiError(query.error);
    content = (
      <View style={styles.result} accessibilityRole="alert">
        <AppText variant="body" color="dangerText">
          {info.message}
        </AppText>
        {info.retryAfterSec ? (
          <AppText variant="caption" color="textSecondary">
            {t('ai.retryAfter', { seconds: info.retryAfterSec })}
          </AppText>
        ) : null}
        <Button
          title={t('ai.retry')}
          variant="secondary"
          leftIcon="refresh-cw"
          onPress={() => void query.refetch()}
        />
      </View>
    );
  } else {
    content = <ReviewResult review={query.data} />;
  }

  return (
    <AiCard title={t('ai.title')} subtitle={t('ai.subtitle')} testID="ai-review-panel">
      <View style={styles.body}>
        {content}
        <AppText variant="caption" color="textSecondary">
          {t('ai.advisory')}
        </AppText>
      </View>
    </AiCard>
  );
}

const useStyles = makeStyles((t) => ({
  body: { gap: spacing.md },
  loading: { gap: spacing.sm },
  result: { gap: spacing.md },
  issues: { gap: spacing.sm },
  issue: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.surfaceAlt,
  },
  issueHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
}));
