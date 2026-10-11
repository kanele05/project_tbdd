import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WorkHeader, WorkShell } from '@/components/layout/work';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ErrorState } from '@/components/ui/ErrorState';
import { FormTextField } from '@/components/ui/FormTextField';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { showToast } from '@/components/ui/Toast';
import { applyAuthError } from '@/features/auth/authErrors';
import { FormError } from '@/features/auth/components/FormError';
import { isOfflineWithoutData, OFFLINE_QUERY_ERROR } from '@/features/learning/queryStatus';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, radius, spacing } from '@/theme';
import type { TeacherProfileDto, TeacherProfileInput } from '@/types/api';

import { useTeacherProfile, useUpdateTeacherProfile } from '../hooks';
import {
  BIO_MAX_LENGTH,
  JOB_TITLE_MAX_LENGTH,
  LOCATION_MAX_LENGTH,
  ORGANIZATION_MAX_LENGTH,
  teacherProfileSchema,
  type TeacherProfileFormValues,
} from '../schemas';

/** Zones offered as one-tap suggestions next to the free-text field. */
export const TIMEZONE_SUGGESTIONS = [
  'Asia/Ho_Chi_Minh',
  'Europe/London',
  'Europe/Vienna',
  'America/New_York',
  'UTC',
] as const;

const FIELDS = ['jobTitle', 'bio', 'organization', 'location', 'timezone'] as const;

function goBack(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/profile');
}

function getDeviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
}

/** Form values -> PATCH body: empty optional fields clear the value (`null`). */
export function toProfileInput(values: TeacherProfileFormValues): TeacherProfileInput {
  return {
    jobTitle: values.jobTitle.trim(),
    bio: values.bio.trim(),
    organization: values.organization.trim() || null,
    location: values.location.trim() || null,
    timezone: values.timezone.trim() || null,
  };
}

function toFormValues(profile: TeacherProfileDto): TeacherProfileFormValues {
  return {
    jobTitle: profile.jobTitle,
    bio: profile.bio,
    organization: profile.organization ?? '',
    location: profile.location ?? '',
    timezone: profile.timezone ?? '',
  };
}

function ProfileForm({ profile }: { profile: TeacherProfileDto }) {
  const { t } = useTranslation(['teaching', 'common']);
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { isWide } = useBreakpoint();
  const update = useUpdateTeacherProfile();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { isDirty },
  } = useForm<TeacherProfileFormValues>({
    resolver: zodResolver(teacherProfileSchema),
    defaultValues: toFormValues(profile),
  });
  const bioLength = useWatch({ control, name: 'bio' }).length;
  const timezone = useWatch({ control, name: 'timezone' });

  const pickTimezone = useCallback(
    (zone: string) => setValue('timezone', zone, { shouldDirty: true, shouldValidate: true }),
    [setValue],
  );
  const handleDeviceZone = useCallback(() => {
    const zone = getDeviceTimeZone();
    if (zone) pickTimezone(zone);
  }, [pickTimezone]);

  const save = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await update.mutateAsync(toProfileInput(values));
      showToast(t('teaching:profile.saved'), { type: 'success' });
      goBack();
    } catch (error) {
      setFormError(applyAuthError(error, setError, FIELDS));
    }
  });

  const fields = (
    <>
      <AppText variant="body" color="textSecondary">
        {t('teaching:profile.intro')}
      </AppText>
      <FormTextField
        control={control}
        name="jobTitle"
        label={t('teaching:profile.jobTitle')}
        placeholder={t('teaching:profile.jobTitlePlaceholder')}
        maxLength={JOB_TITLE_MAX_LENGTH}
        returnKeyType="next"
        testID="teacher-job-title"
      />
      <View>
        <FormTextField
          control={control}
          name="bio"
          label={t('teaching:profile.bio')}
          placeholder={t('teaching:profile.bioPlaceholder')}
          multiline
          numberOfLines={6}
          maxLength={BIO_MAX_LENGTH}
          textAlignVertical="top"
          testID="teacher-bio"
        />
        <AppText variant="caption" align="right" style={styles.counter}>
          {t('teaching:profile.counter', { count: bioLength, max: BIO_MAX_LENGTH })}
        </AppText>
      </View>
      <FormTextField
        control={control}
        name="organization"
        label={t('teaching:profile.organization')}
        placeholder={t('teaching:profile.organizationPlaceholder')}
        maxLength={ORGANIZATION_MAX_LENGTH}
        returnKeyType="next"
      />
      <FormTextField
        control={control}
        name="location"
        label={t('teaching:profile.location')}
        placeholder={t('teaching:profile.locationPlaceholder')}
        maxLength={LOCATION_MAX_LENGTH}
        returnKeyType="next"
      />
      <View style={styles.zone}>
        <FormTextField
          control={control}
          name="timezone"
          label={t('teaching:profile.timezone')}
          placeholder={t('teaching:profile.timezonePlaceholder')}
          helperText={t('teaching:profile.timezoneHelper')}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          testID="teacher-timezone"
        />
        <View style={styles.chips}>
          {TIMEZONE_SUGGESTIONS.map((zone) => (
            <Chip
              key={zone}
              label={zone}
              size="sm"
              selected={timezone === zone}
              onPress={() => pickTimezone(zone)}
            />
          ))}
        </View>
        <Button
          title={t('teaching:profile.useDeviceTimezone')}
          variant="ghost"
          size="sm"
          leftIcon="map-pin"
          onPress={handleDeviceZone}
        />
      </View>
      <FormError message={formError} />
      <Button
        title={t('common:actions.save')}
        onPress={() => void save()}
        loading={update.isPending}
        disabled={!isDirty}
        fullWidth
        testID="teacher-profile-save"
      />
    </>
  );

  // PC: the form is a bordered card; the page (WorkShell) scrolls, there is no inner ScrollView.
  if (isWide) {
    return (
      <View style={styles.card} testID="teacher-profile-card">
        {fields}
      </View>
    );
  }
  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {fields}
    </ScrollView>
  );
}

/**
 * SC-30 Edit teacher profile (FR-49): job title, about, organization, location and time zone of the
 * public teacher page. Loads `GET /me/teacher-profile` (skeleton / error with Retry), saves with PATCH.
 */
export function TeacherProfileEditScreen() {
  const { t } = useTranslation('teaching');
  const styles = useStyles();
  const { isWide } = useBreakpoint();
  const query = useTeacherProfile();
  const { refetch } = query;
  const handleRetry = useCallback(() => void refetch(), [refetch]);

  let body;
  if (query.data) {
    body = <ProfileForm key={query.data.id} profile={query.data} />;
  } else if (isOfflineWithoutData(query)) {
    body = <ErrorState error={OFFLINE_QUERY_ERROR} onRetry={handleRetry} />;
  } else if (query.isError) {
    body = <ErrorState error={query.error} title={t('profile.loadFailed')} onRetry={handleRetry} />;
  } else {
    body = (
      <View
        style={[styles.content, isWide ? styles.flush : null]}
        testID="teacher-profile-skeleton"
      >
        <Skeleton height={52} />
        <Skeleton height={140} />
        <Skeleton height={52} />
        <Skeleton height={52} />
        <Skeleton height={52} />
      </View>
    );
  }

  if (isWide) {
    return (
      <WorkShell maxWidth={FORM_MAX_WIDTH} testID="teacher-profile-desktop">
        <WorkHeader title={t('profile.title')} hasBack />
        {body}
      </WorkShell>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <ScreenHeader title={t('profile.title')} />
      {body}
    </KeyboardAvoidingView>
  );
}

const FORM_MAX_WIDTH = 720;

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  content: { gap: spacing.lg, padding: layout.screenPaddingX },
  flush: { padding: 0 },
  card: {
    gap: spacing.lg,
    padding: spacing.xxl,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: t.colors.borderSubtle,
    backgroundColor: t.colors.card,
  },
  counter: { marginTop: spacing.xs },
  zone: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
}));
