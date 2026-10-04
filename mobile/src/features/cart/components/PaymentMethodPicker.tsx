import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, type FeatherIconName } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { layout, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { PaymentMethod } from '@/types/api';

export type PaymentMethodPickerProps = {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  disabled?: boolean;
};

type Option = { method: PaymentMethod; key: 'card' | 'ewallet'; icon: FeatherIconName };

const OPTIONS: readonly Option[] = [
  { method: 'MOCK_CARD', key: 'card', icon: 'credit-card' },
  { method: 'MOCK_EWALLET', key: 'ewallet', icon: 'smartphone' },
];

const RADIO_SIZE = 22;

/** Radio group: Mock Card / Mock E-wallet. The chosen row gets an accent hairline + soft tint. */
export function PaymentMethodPicker({
  value,
  onChange,
  disabled = false,
}: PaymentMethodPickerProps) {
  const { t } = useTranslation('cart');
  const { colors } = useTheme();
  const themed = useStyles();
  return (
    <View style={styles.group} accessibilityRole="radiogroup">
      {OPTIONS.map((option) => {
        const isSelected = option.method === value;
        const title = t(`methods.${option.key}.title`);
        const subtitle = t(`methods.${option.key}.subtitle`);
        return (
          <Pressable
            key={option.method}
            onPress={() => onChange(option.method)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityLabel={t('methods.a11y', { title, subtitle })}
            accessibilityState={{ checked: isSelected, disabled }}
            style={[styles.option, themed.option, isSelected ? themed.optionSelected : null]}
          >
            <View style={themed.iconWrap}>
              <Feather name={option.icon} size={20} color={colors.primaryText} />
            </View>
            <View style={styles.texts}>
              <AppText variant="label">{title}</AppText>
              <AppText variant="caption">{subtitle}</AppText>
            </View>
            <View style={[styles.radio, themed.radio, isSelected ? themed.radioSelected : null]}>
              {isSelected ? <View style={themed.radioDot} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  option: { borderColor: t.colors.border, backgroundColor: t.colors.card },
  optionSelected: { borderColor: t.colors.primaryText, backgroundColor: t.colors.primarySoft },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.primarySoft,
  },
  radio: { borderColor: t.colors.border },
  radioSelected: { borderColor: t.colors.primaryText },
  radioDot: {
    width: RADIO_SIZE / 2,
    height: RADIO_SIZE / 2,
    borderRadius: RADIO_SIZE / 4,
    backgroundColor: t.colors.primaryText,
  },
}));

const styles = StyleSheet.create({
  group: { gap: spacing.md },
  option: {
    minHeight: layout.minTouchTarget + spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.card,
  },
  texts: { flex: 1 },
  radio: {
    width: RADIO_SIZE,
    height: RADIO_SIZE,
    borderRadius: RADIO_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
