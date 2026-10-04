import { Image } from 'expo-image';
import { memo, useCallback } from 'react';
import { Pressable, View } from 'react-native';

import { AiCard, AppText, Button, Skeleton } from '@/components/ui';
import { useAiRecommendations } from '@/features/ai/hooks';
import { openCourse, openSearchTab } from '@/features/search/navigation';
import { useTranslation } from '@/i18n';
import { getErrorMessage } from '@/lib/appError';
import { useAuthStore } from '@/stores/authStore';
import { layout, makeStyles, radius, spacing } from '@/theme';
import type { AiRecommendationItemDto } from '@/types/api';

const MAX_STEPS = 5;
const STEP_SIZE = 28;
const THUMB_SIZE = 56;

type StepProps = {
  item: AiRecommendationItemDto;
  step: number;
  isLast: boolean;
  onPress: (courseId: string) => void;
};

/** One course of the learning path: numbered node on a vertical line, thumbnail, title, reason. */
const PathStep = memo(function PathStep({ item, step, isLast, onPress }: StepProps) {
  const { t } = useTranslation('home');
  const styles = useStyles();
  const { course } = item;
  return (
    <Pressable
      onPress={() => onPress(course.id)}
      accessibilityRole="button"
      accessibilityLabel={t('ai.stepLabel', { step, title: course.title, reason: item.reason })}
      style={({ pressed }) => [styles.step, pressed ? styles.pressed : null]}
    >
      <View style={styles.rail}>
        <View style={styles.node}>
          <AppText variant="micro" color="onPrimary" family="bodyBold">
            {step}
          </AppText>
        </View>
        {isLast ? null : <View style={styles.line} />}
      </View>
      <View style={[styles.stepBody, isLast ? null : styles.stepBodySpaced]}>
        <Image
          source={{ uri: course.thumbnailUrl }}
          style={styles.thumb}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={150}
          recyclingKey={course.id}
          accessibilityIgnoresInvertColors
        />
        <View style={styles.stepText}>
          <AppText variant="cardTitle" numberOfLines={2}>
            {course.title}
          </AppText>
          <AppText variant="caption" numberOfLines={3}>
            {item.reason}
          </AppText>
        </View>
      </View>
    </Pressable>
  );
});

function PathSkeleton() {
  const styles = useStyles();
  const { t } = useTranslation();
  return (
    <View
      style={styles.skeleton}
      accessible
      accessibilityLabel={t('loading')}
      accessibilityState={{ busy: true }}
    >
      {[0, 1, 2].map((index) => (
        <View key={index} style={styles.skeletonRow}>
          <Skeleton width={STEP_SIZE} height={STEP_SIZE} borderRadius={radius.pill} />
          <Skeleton width={THUMB_SIZE} height={THUMB_SIZE} borderRadius={radius.button} />
          <View style={styles.skeletonLines}>
            <Skeleton width="80%" height={16} />
            <Skeleton width="60%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

type MessageProps = {
  text: string;
  actionLabel: string;
  onAction: () => void;
  isAlert?: boolean;
};

/** Error / empty message of the card with one outline button (the card is not the screen's CTA). */
function Message({ text, actionLabel, onAction, isAlert = false }: MessageProps) {
  const styles = useStyles();
  return (
    <View style={styles.message} accessibilityRole={isAlert ? 'alert' : undefined}>
      <AppText variant="body" color="textSecondary">
        {text}
      </AppText>
      <Button title={actionLabel} variant="outline" size="sm" onPress={onAction} />
    </View>
  );
}

/**
 * "AI picks for you" (AI-04): a 3-5 course learning path with the reason for each course
 * (`GET /me/ai/recommendations`, cached on the server). Only requested when signed in; a busy or
 * unavailable AI (429 / 503) shows a polite message with a Retry button and never blocks Home.
 */
export function AiRecommendationsCard() {
  const { t } = useTranslation('home');
  const styles = useStyles();
  const isSignedIn = useAuthStore((state) => state.user != null);
  const { data, isPending, isError, error, refetch } = useAiRecommendations(isSignedIn);
  const handleRetry = useCallback(() => void refetch(), [refetch]);

  if (!isSignedIn) return null;

  const items = (data?.items ?? []).slice(0, MAX_STEPS);
  let body;
  if (isPending) {
    body = <PathSkeleton />;
  } else if (isError) {
    body = (
      <Message
        text={getErrorMessage(error)}
        actionLabel={t('ai.retry')}
        onAction={handleRetry}
        isAlert
      />
    );
  } else if (items.length === 0) {
    body = <Message text={t('ai.empty')} actionLabel={t('ai.explore')} onAction={openSearchTab} />;
  } else {
    body = (
      <>
        {data?.encouragement ? (
          <AppText variant="body" color="textSecondary">
            {data.encouragement}
          </AppText>
        ) : null}
        <View>
          {items.map((item, index) => (
            <PathStep
              key={item.course.id}
              item={item}
              step={index + 1}
              isLast={index === items.length - 1}
              onPress={openCourse}
            />
          ))}
        </View>
      </>
    );
  }

  return (
    <View style={styles.wrap}>
      <AiCard title={t('ai.title')} subtitle={t('ai.subtitle')} variant="panel" testID="ai-card">
        {body}
      </AiCard>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { paddingHorizontal: layout.screenPaddingX },
  step: { flexDirection: 'row', gap: spacing.md },
  pressed: { opacity: 0.8 },
  rail: { width: STEP_SIZE, alignItems: 'center' },
  node: {
    width: STEP_SIZE,
    height: STEP_SIZE,
    borderRadius: STEP_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.primary,
  },
  line: { flex: 1, width: 2, marginVertical: spacing.xs, backgroundColor: t.colors.border },
  stepBody: { flex: 1, flexDirection: 'row', gap: spacing.md },
  stepBodySpaced: { paddingBottom: spacing.lg },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radius.button,
    backgroundColor: t.colors.surface,
  },
  stepText: { flex: 1, gap: spacing.xxs },
  skeleton: { gap: spacing.lg },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  skeletonLines: { flex: 1, gap: spacing.sm },
  message: { gap: spacing.md, alignItems: 'flex-start' },
}));
