import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, type FeatherIconName } from '@/components/ui';
import { colors, layout, radius, spacing } from '@/theme';
import type { PaymentMethod } from '@/types/api';

export type PaymentMethodPickerProps = {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  disabled?: boolean;
};

type Option = { method: PaymentMethod; title: string; subtitle: string; icon: FeatherIconName };

const OPTIONS: readonly Option[] = [
  {
    method: 'MOCK_CARD',
    title: 'Mock Card',
    subtitle: 'Visa ending 4242 (demo)',
    icon: 'credit-card',
  },
  {
    method: 'MOCK_EWALLET',
    title: 'Mock E-wallet',
    subtitle: 'Demo wallet balance',
    icon: 'smartphone',
  },
];

/** Radio group: Mock Card / Mock E-wallet. */
export function PaymentMethodPicker({
  value,
  onChange,
  disabled = false,
}: PaymentMethodPickerProps) {
  return (
    <View style={styles.group} accessibilityRole="radiogroup">
      {OPTIONS.map((option) => {
        const isSelected = option.method === value;
        return (
          <Pressable
            key={option.method}
            onPress={() => onChange(option.method)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityLabel={`${option.title}, ${option.subtitle}`}
            accessibilityState={{ checked: isSelected, disabled }}
            style={[styles.option, isSelected ? styles.optionSelected : null]}
          >
            <View style={styles.iconWrap}>
              <Feather name={option.icon} size={20} color={colors.primary} />
            </View>
            <View style={styles.texts}>
              <AppText variant="label">{option.title}</AppText>
              <AppText variant="caption">{option.subtitle}</AppText>
            </View>
            <View style={[styles.radio, isSelected ? styles.radioSelected : null]}>
              {isSelected ? <View style={styles.radioDot} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const RADIO_SIZE = 20;

const styles = StyleSheet.create({
  group: { gap: spacing.md },
  option: {
    minHeight: layout.minTouchTarget + spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    backgroundColor: colors.background,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  texts: { flex: 1 },
  radio: {
    width: RADIO_SIZE,
    height: RADIO_SIZE,
    borderRadius: RADIO_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.primary },
  radioDot: {
    width: RADIO_SIZE / 2,
    height: RADIO_SIZE / 2,
    borderRadius: RADIO_SIZE / 4,
    backgroundColor: colors.primary,
  },
});
