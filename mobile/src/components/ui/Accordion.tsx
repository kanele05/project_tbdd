import Feather from '@expo/vector-icons/Feather';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { spacing, useTheme } from '@/theme';

import { AppText } from './AppText';

export type AccordionProps = {
  title: string;
  children: ReactNode;
  /** Uncontrolled initial state. */
  defaultExpanded?: boolean;
  /** Controlled state: when provided, use together with `onToggle`. */
  expanded?: boolean;
  onToggle?: (expanded: boolean) => void;
  style?: StyleProp<ViewStyle>;
};

/** Collapsible section ("I - Introduction" + chevron) used by the curriculum list. */
export function Accordion({
  title,
  children,
  defaultExpanded = false,
  expanded,
  onToggle,
  style,
}: AccordionProps) {
  const { colors } = useTheme();
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isExpanded = expanded ?? internalExpanded;

  const handlePress = () => {
    const next = !isExpanded;
    if (expanded === undefined) setInternalExpanded(next);
    onToggle?.(next);
  };

  return (
    <View style={style}>
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: isExpanded }}
        style={styles.header}
      >
        <AppText variant="title" style={styles.title} numberOfLines={2}>
          {title}
        </AppText>
        <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.text} />
      </Pressable>
      {isExpanded ? <View>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: { flex: 1 },
});
