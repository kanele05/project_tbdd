import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { makeStyles, radius, spacing } from '@/theme';

import type { NavTone } from './navTone';
import { useHover } from './useHover';

export type NavLinkProps = {
  label: string;
  isActive: boolean;
  tone: NavTone;
  onPress: () => void;
  testID?: string;
};

/** A text link of the top bar: active = full color + straight neon bar under the label, hover = soft pill. */
export function NavLink({ label, isActive, tone, onPress, testID }: NavLinkProps) {
  const styles = useStyles();
  const { isHovered, hoverProps } = useHover();
  return (
    <Pressable
      {...hoverProps}
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={label}
      accessibilityState={{ selected: isActive }}
      testID={testID}
      style={({ pressed }) => [
        styles.link,
        isHovered ? { backgroundColor: tone.hoverBackground } : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <AppText
        variant="label"
        family="bodySemiBold"
        numberOfLines={1}
        style={{ color: isActive || isHovered ? tone.color : tone.mutedColor }}
      >
        {label}
      </AppText>
      {isActive ? (
        <View style={styles.indicator} testID={testID ? `${testID}-indicator` : undefined} />
      ) : null}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  link: {
    height: 40,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    borderRadius: radius.pill,
    cursor: 'pointer',
  },
  // Straight, under the label only (a border on the pill would curve at the rounded corners).
  indicator: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: t.colors.primary,
  },
  pressed: { opacity: 0.7 },
}));
