import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { colors, spacing } from '@/theme';

type RadioRowProps = {
  label: string;
  isSelected: boolean;
  onPress: () => void;
};

/** Radio option with a full-width 48 dp touch target ("Sort by" in SC-07). */
function RadioRowBase({ label, isSelected, onPress }: RadioRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: isSelected }}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
    >
      <View style={[styles.outer, isSelected ? styles.outerSelected : null]}>
        {isSelected ? <View style={styles.inner} /> : null}
      </View>
      <AppText variant="body" color={isSelected ? 'textPrimary' : 'textSecondary'}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pressed: { opacity: 0.7 },
  outer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
  },
  outerSelected: { borderColor: colors.primary },
  inner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
});

export const RadioRow = memo(RadioRowBase);
