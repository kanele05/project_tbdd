import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { FormTextField } from '@/components/ui/FormTextField';
import { TextField } from '@/components/ui/TextField';
import { FormError } from '@/features/auth/components/FormError';
import { useTranslation } from '@/i18n';
import { makeStyles, spacing } from '@/theme';

import type { useEditProfile } from '../useEditProfile';

export type EditProfileFormProps = { edit: ReturnType<typeof useEditProfile> };

/** Full name, headline, read-only e-mail, the form error and Save (SC-21), shared by phone and PC. */
export function EditProfileForm({ edit }: EditProfileFormProps) {
  const { control, user, isSaving, hasChanges, formError, save } = edit;
  const { t } = useTranslation(['profile', 'auth', 'common']);
  const styles = useStyles();
  return (
    <View style={styles.form}>
      <FormTextField
        control={control}
        name="fullName"
        label={t('auth:fullName')}
        placeholder={t('auth:placeholders.fullName')}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        maxLength={60}
      />
      <FormTextField
        control={control}
        name="headline"
        label={t('profile:edit.headline')}
        placeholder={t('profile:edit.headlinePlaceholder')}
        returnKeyType="done"
        maxLength={80}
      />
      <TextField
        label={t('auth:email')}
        value={user?.email ?? ''}
        editable={false}
        helperText={t('profile:edit.emailHelper')}
      />
      <FormError message={formError} />
      <Button
        title={t('common:actions.save')}
        onPress={() => void save()}
        loading={isSaving}
        disabled={!hasChanges}
        fullWidth
        testID="edit-profile-save"
      />
    </View>
  );
}

const useStyles = makeStyles(() => ({
  form: { gap: spacing.lg },
}));
