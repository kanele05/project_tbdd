import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { colors, spacing } from '@/theme';

import { getBenefitIcon } from '../courseAction';

export type BenefitsListProps = {
  /** Already prepared by `buildBenefits` (video hours first, no certificate). */
  benefits: readonly string[];
};

function BenefitIconView({ text }: { text: string }) {
  const icon = getBenefitIcon(text);
  return icon.family === 'ionicons' ? (
    <Ionicons name={icon.name} size={24} color={colors.primary} />
  ) : (
    <Feather name={icon.name} size={24} color={colors.primary} />
  );
}

/** Overview tab "Benefits": a primary icon + text per row. */
function BenefitsListBase({ benefits }: BenefitsListProps) {
  return (
    <View style={styles.list}>
      {benefits.map((text) => (
        <View key={text} style={styles.row}>
          <BenefitIconView text={text} />
          <AppText variant="body" style={styles.text}>
            {text}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  text: { flex: 1 },
});

export const BenefitsList = memo(BenefitsListBase);
