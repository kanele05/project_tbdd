import Feather from '@expo/vector-icons/Feather';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { spacing, useTheme } from '@/theme';

export type BenefitsListProps = {
  /** Already prepared by `buildBenefits` (video hours first, no certificate). */
  benefits: readonly string[];
};

const TICK_SIZE = 20;

/** "This course includes": an accent tick + text per row (concept B checklist). */
function BenefitsListBase({ benefits }: BenefitsListProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.list}>
      {benefits.map((text) => (
        <View key={text} style={styles.row}>
          <Feather name="check" size={TICK_SIZE} color={colors.primaryText} style={styles.tick} />
          <AppText variant="body" style={styles.text}>
            {text}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  // The tick lines up with the first text line (22 dp pitch).
  tick: { marginTop: 1 },
  text: { flex: 1 },
});

export const BenefitsList = memo(BenefitsListBase);
