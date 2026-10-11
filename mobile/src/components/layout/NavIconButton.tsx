import Feather from '@expo/vector-icons/Feather';
import { Pressable, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import type { FeatherIconName } from '@/components/ui/icons';
import { makeStyles, radius } from '@/theme';

import type { NavTone } from './navTone';
import { useHover } from './useHover';

export const NAV_ICON_BUTTON_SIZE = 44;

export type NavIconButtonProps = {
  icon: FeatherIconName;
  accessibilityLabel: string;
  tone: NavTone;
  onPress: () => void;
  /** Count bubble in the top-right corner (cart items, unread notifications). Hidden at 0. */
  badgeCount?: number;
  testID?: string;
};

/** Round 44 dp icon button of the top bar with a hover background and an optional count badge. */
export function NavIconButton({
  icon,
  accessibilityLabel,
  tone,
  onPress,
  badgeCount,
  testID,
}: NavIconButtonProps) {
  const styles = useStyles();
  const { isHovered, hoverProps } = useHover();
  return (
    <Pressable
      {...hoverProps}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        isHovered ? { backgroundColor: tone.hoverBackground } : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Feather name={icon} size={22} color={isHovered ? tone.color : tone.mutedColor} />
      {badgeCount != null && badgeCount > 0 ? (
        <View style={styles.badge} pointerEvents="none">
          <Badge count={badgeCount} />
        </View>
      ) : null}
    </Pressable>
  );
}

const useStyles = makeStyles(() => ({
  button: {
    width: NAV_ICON_BUTTON_SIZE,
    height: NAV_ICON_BUTTON_SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  pressed: { opacity: 0.7 },
  badge: { position: 'absolute', top: 2, right: 0 },
}));
