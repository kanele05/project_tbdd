import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { TextField } from '@/components/ui/TextField';
import { useTranslation } from '@/i18n';
import { makeStyles, spacing } from '@/theme';

import { STUDIO_LIMITS } from '../limits';

export type BenefitsEditorProps = {
  value: string[];
  onChange: (benefits: string[]) => void;
  disabled?: boolean;
};

/** "What you will learn" list (up to 10 lines): add, edit and remove one line at a time. */
export function BenefitsEditor({ value, onChange, disabled = false }: BenefitsEditorProps) {
  const { t } = useTranslation('studio');
  const styles = useStyles();
  const canAdd = !disabled && value.length < STUDIO_LIMITS.maxBenefits;
  return (
    <View style={styles.wrap} testID="benefits-editor">
      <View style={styles.labelRow}>
        <AppText variant="label">{t('benefits.label')}</AppText>
        <AppText variant="caption">
          {t('benefits.count', { count: value.length, max: STUDIO_LIMITS.maxBenefits })}
        </AppText>
      </View>
      {value.length === 0 ? <AppText variant="caption">{t('benefits.empty')}</AppText> : null}
      {value.map((line, index) => (
        <View key={index} style={styles.row}>
          <TextField
            containerStyle={styles.input}
            value={line}
            onChangeText={(text) => onChange(value.map((item, i) => (i === index ? text : item)))}
            placeholder={t('benefits.placeholder')}
            accessibilityLabel={t('benefits.itemLabel', { number: index + 1 })}
            maxLength={STUDIO_LIMITS.benefitMax}
            editable={!disabled}
          />
          {!disabled ? (
            <IconButton
              icon="trash-2"
              color="dangerText"
              onPress={() => onChange(value.filter((_, i) => i !== index))}
              accessibilityLabel={t('benefits.remove', { number: index + 1 })}
            />
          ) : null}
        </View>
      ))}
      {canAdd ? (
        <Button
          title={t('benefits.add')}
          variant="outline"
          size="sm"
          leftIcon="plus"
          onPress={() => onChange([...value, ''])}
          testID="benefit-add"
        />
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(() => ({
  wrap: { gap: spacing.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  input: { flex: 1 },
}));
