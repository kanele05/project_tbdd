import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui';
import { layout, makeStyles, spacing } from '@/theme';

type RadioRowProps = {
  label: string;
  isSelected: boolean;
  onPress: () => void;
};

/** Radio option with a full-width 48 dp touch target ("Sort by" in SC-07). */
function RadioRowBase({ label, isSelected, onPress }: RadioRowProps) {
  const styles = useStyles();
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
      <AppText variant="body" color={isSelected ? 'text' : 'textSecondary'}>
        {label}
      </AppText>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    minHeight: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pressed: { opacity: 0.7 },
  outer: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    borderWidth: 2,
    borderColor: t.colors.border,
  },
  // `primaryText`, not the neon: the neon ring is invisible on the cream light background.
  outerSelected: { borderColor: t.colors.primaryText },
  inner: { width: 10, height: 10, borderRadius: 5, backgroundColor: t.colors.primaryText },
}));

export const RadioRow = memo(RadioRowBase);
