import Feather from '@expo/vector-icons/Feather';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTranslation } from '@/i18n';
import { makeStyles, spacing, useTheme } from '@/theme';

import { describeAiError } from '../aiErrors';
import { useAiLessonSummary } from '../hooks';
import { AiBadge } from './AiBadge';

export type LessonSummaryProps = { lessonId: string };

/**
 * The AI summary of a lesson, loaded when it is first opened: paragraph + key points, tagged
 * "Created by AI". Loading shows skeleton lines; 403 / 429 / 503 show the message and Retry.
 */
export function LessonSummary({ lessonId }: LessonSummaryProps) {
  const { t } = useTranslation(['ai', 'common']);
  const { colors } = useTheme();
  const styles = useStyles();
  const summary = useAiLessonSummary(lessonId);

  if (summary.isPending) {
    return (
      <View
        style={styles.container}
        accessible
        accessibilityLabel={t('summary.loading')}
        accessibilityState={{ busy: true }}
        testID="summary-loading"
      >
        <Skeleton height={14} />
        <Skeleton height={14} />
        <Skeleton width="70%" height={14} />
      </View>
    );
  }
  if (summary.isError) {
    return (
      <View style={styles.container} accessibilityRole="alert" testID="summary-error">
        <AppText variant="body" color="dangerText">
          {describeAiError(summary.error).message}
        </AppText>
        <Button
          title={t('common:actions.retry')}
          variant="secondary"
          size="sm"
          leftIcon="refresh-cw"
          onPress={() => void summary.refetch()}
        />
      </View>
    );
  }

  const { summary: text, keyPoints } = summary.data;
  return (
    <View style={styles.container} testID="summary-content">
      <View style={styles.head}>
        <AppText variant="title" accessibilityRole="header" style={styles.title}>
          {t('summary.title')}
        </AppText>
        <AiBadge />
      </View>
      <AppText variant="body" color="textSecondary">
        {text}
      </AppText>
      {keyPoints.length > 0 ? (
        <View style={styles.points}>
          <AppText variant="label" color="text">
            {t('summary.keyPoints')}
          </AppText>
          {keyPoints.map((point) => (
            <View key={point} style={styles.point}>
              <Feather name="check" size={18} color={colors.primaryText} style={styles.check} />
              <AppText variant="body" style={styles.pointText}>
                {point}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: t.colors.borderSubtle,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: { flex: 1 },
  points: { gap: spacing.sm, marginTop: spacing.xs },
  point: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  check: { marginTop: 2 },
  pointText: { flex: 1 },
}));
