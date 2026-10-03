import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { FormTextField } from '@/components/ui/FormTextField';
import { StarRating } from '@/components/ui/StarRating';
import { useToast } from '@/components/ui/Toast';
import { applyAuthError } from '@/features/auth/authErrors';
import { FormError } from '@/features/auth/components/FormError';
import { isNotEnrolledError } from '@/features/learning/accessGuard';
import { getErrorMessage } from '@/lib/appError';
import { spacing } from '@/theme';
import type { ReviewDto } from '@/types/api';

import { useSaveReview } from '../hooks';
import { reviewSchema, type ReviewFormValues } from '../schema';
import { REVIEW_MAX_LENGTH, REVIEW_STRINGS } from '../strings';

export type ReviewFormProps = {
  courseId: string;
  /** The user's current review: the form opens pre-filled to edit it (BR-08). */
  initialReview: ReviewDto | null;
};

const FIELDS = ['rating', 'content'] as const;

/** SC-11 form: 1-5 stars, 10-1000 characters with a live counter, Submit. */
export function ReviewForm({ courseId, initialReview }: ReviewFormProps) {
  const toast = useToast();
  const saveReview = useSaveReview(courseId);
  // Errors are shown inline: a toast can be hidden behind a native modal (iOS).
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: initialReview?.rating ?? 0, content: initialReview?.content ?? '' },
  });
  const contentLength = useWatch({ control, name: 'content' }).length;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await saveReview.mutateAsync({ rating: values.rating, content: values.content.trim() });
      // Close the modal first, then toast on the screen underneath.
      router.back();
      toast.success(REVIEW_STRINGS.saved);
    } catch (error) {
      if (isNotEnrolledError(error)) {
        router.back();
        toast.error(getErrorMessage(error));
        return;
      }
      setFormError(applyAuthError(error, setError, FIELDS));
    }
  });

  return (
    <View style={styles.form}>
      <View style={styles.field}>
        <AppText variant="label">{REVIEW_STRINGS.yourRating}</AppText>
        <Controller
          control={control}
          name="rating"
          render={({ field }) => (
            <StarRating value={field.value} onChange={field.onChange} size={36} />
          )}
        />
        {errors.rating ? (
          <AppText variant="caption" color="dangerText" accessibilityLiveRegion="polite">
            {errors.rating.message}
          </AppText>
        ) : null}
      </View>

      <View>
        <FormTextField
          control={control}
          name="content"
          label={REVIEW_STRINGS.yourReview}
          placeholder={REVIEW_STRINGS.reviewPlaceholder}
          multiline
          numberOfLines={6}
          maxLength={REVIEW_MAX_LENGTH}
          textAlignVertical="top"
        />
        <AppText variant="caption" align="right" style={styles.counter}>
          {`${contentLength}/${REVIEW_MAX_LENGTH}`}
        </AppText>
      </View>

      <FormError message={formError} />

      <Button
        title={REVIEW_STRINGS.submit}
        onPress={() => void onSubmit()}
        loading={saveReview.isPending}
        fullWidth
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.xl },
  field: { gap: spacing.sm },
  counter: { marginTop: spacing.xs },
});
