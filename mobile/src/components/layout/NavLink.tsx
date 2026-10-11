import { Pressable } from 'react-native';

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

/** A text link of the top bar: active = full color + neon underline, hover = soft pill (no layout shift). */
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
        isActive ? styles.active : null,
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
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  link: {
    height: 40,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    cursor: 'pointer',
  },
  active: { borderBottomColor: t.colors.primary },
  pressed: { opacity: 0.7 },
}));
