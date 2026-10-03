import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { spacing } from '@/theme';

type FilterSectionProps = { title: string; children: ReactNode };

/** A titled group of the Filter modal (Category, Price, Rating, Sort by). */
export function FilterSection({ title, children }: FilterSectionProps) {
  return (
    <View style={styles.section}>
      <AppText variant="title" accessibilityRole="header">
        {title}
      </AppText>
      {children}
    </View>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <View style={styles.chips}>{children}</View>;
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  // Same chip spacing as the Search "Hot topics" (design): 4 dp in a row, 8 dp between rows.
  chips: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.xs, rowGap: spacing.sm },
});
