import { Controller, type Control } from 'react-hook-form';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/i18n';
import { makeStyles, radius, spacing, useTheme } from '@/theme';

import type { RegisterFormValues } from '../schemas';

type RegistrationRolePickerProps = {
  control: Control<RegisterFormValues>;
  disabled?: boolean;
};

const ROLES = ['STUDENT', 'TEACHER'] as const;

export function RegistrationRolePicker({ control, disabled = false }: RegistrationRolePickerProps) {
  const { t } = useTranslation('auth');
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <Controller
      control={control}
      name="role"
      render={({ field: { onChange, value } }) => (
        <View accessibilityRole="radiogroup" accessibilityLabel={t('role.label')}>
          <AppText variant="label" style={styles.label}>
            {t('role.label')}
          </AppText>
          <View style={styles.options}>
            {ROLES.map((role) => {
              const isSelected = value === role;
              const title = role === 'STUDENT' ? t('role.student') : t('role.teacher');
              return (
                <Pressable
                  key={role}
                  accessibilityRole="radio"
                  accessibilityLabel={title}
                  accessibilityState={{ checked: isSelected, disabled }}
                  aria-checked={isSelected}
                  aria-disabled={disabled}
                  disabled={disabled}
                  onPress={() => onChange(role)}
                  style={[
                    styles.option,
                    {
                      backgroundColor: isSelected ? colors.primarySoft : colors.card,
                      borderColor: isSelected ? colors.primaryText : colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.indicator,
                      { borderColor: isSelected ? colors.primaryText : colors.textMuted },
                    ]}
                  >
                    {isSelected ? (
                      <View
                        style={[styles.indicatorDot, { backgroundColor: colors.primaryText }]}
                      />
                    ) : null}
                  </View>
                  <AppText variant="label" style={styles.optionLabel}>
                    {title}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    />
  );
}

const useStyles = makeStyles(() => ({
  label: { marginBottom: spacing.sm },
  options: { flexDirection: 'row', gap: spacing.sm },
  option: {
    flex: 1,
    minHeight: 52,
    borderWidth: 1,
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  optionLabel: { flexShrink: 1 },
  indicator: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorDot: { width: 10, height: 10, borderRadius: radius.pill },
}));
