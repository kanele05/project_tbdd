import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { FormTextField } from '@/components/ui/FormTextField';
import { showToast } from '@/components/ui/Toast';
import { applyAuthError } from '@/features/auth/authErrors';
import { FormError } from '@/features/auth/components/FormError';
import { useTranslation } from '@/i18n';
import { spacing } from '@/theme';
import type { ReviewDto } from '@/types/api';

import { useReplyToReview } from '../hooks';
import { REPLY_MAX_LENGTH, replySchema, type ReplyFormValues } from '../schemas';
import { SheetModal } from './SheetModal';

export type ReviewReplySheetProps = {
  /** The review being answered; the sheet is open while this is not null. */
  review: ReviewDto | null;
  onClose: () => void;
};

const FIELDS = ['reply'] as const;

const styles = StyleSheet.create({ counter: { marginTop: spacing.xs } });

function ReplyForm({ review, onClose }: { review: ReviewDto; onClose: () => void }) {
  const { t } = useTranslation('review');
  const replyToReview = useReplyToReview();
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, setError } = useForm<ReplyFormValues>({
    resolver: zodResolver(replySchema),
    defaultValues: { reply: review.teacherReply ?? '' },
  });
  const length = useWatch({ control, name: 'reply' }).length;

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await replyToReview.mutateAsync({ reviewId: review.id, reply: values.reply.trim() });
      onClose();
      showToast(t('reply.saved'), { type: 'success' });
    } catch (error) {
      // Shown inline: a toast can sit behind the native modal.
      setFormError(applyAuthError(error, setError, FIELDS));
    }
  });

  return (
    <>
      <View>
        <FormTextField
          control={control}
          name="reply"
          placeholder={t('reply.placeholder')}
          accessibilityLabel={t('reply.sheetTitle')}
          multiline
          numberOfLines={5}
          maxLength={REPLY_MAX_LENGTH}
          textAlignVertical="top"
          autoFocus
        />
        <AppText variant="caption" align="right" style={styles.counter}>
          {t('reply.counter', { count: length, max: REPLY_MAX_LENGTH })}
        </AppText>
      </View>
      <FormError message={formError} />
      <Button
        title={t('reply.save')}
        onPress={() => void submit()}
        loading={replyToReview.isPending}
        fullWidth
        testID="review-reply-save"
      />
    </>
  );
}

/** Sheet where the course teacher writes or edits the single reply to a review (BR-25, 1-1000 characters). */
export function ReviewReplySheet({ review, onClose }: ReviewReplySheetProps) {
  const { t } = useTranslation('review');
  return (
    <SheetModal
      isVisible={review !== null}
      title={t('reply.sheetTitle')}
      subtitle={
        review
          ? t('reply.sheetSubtitle', { name: review.user.fullName, rating: review.rating })
          : undefined
      }
      onClose={onClose}
      testID="review-reply-sheet"
    >
      {review ? <ReplyForm key={review.id} review={review} onClose={onClose} /> : null}
    </SheetModal>
  );
}
