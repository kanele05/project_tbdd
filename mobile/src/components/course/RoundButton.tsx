import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet } from 'react-native';

import { darkPalette, withAlpha } from '@/theme';

const BUTTON_SIZE = 36;

type RoundButtonProps = {
  icon: 'play' | 'shopping-cart' | 'chevron-down';
  label: string;
  isPrimary?: boolean;
  onPress: () => void;
  onFocus: () => void;
  onBlur: () => void;
};

/** 36 dp glass disc (48 dp touch area through `hitSlop`) on the photo. */
export function RoundButton({
  icon,
  label,
  isPrimary = false,
  onPress,
  onFocus,
  onBlur,
}: RoundButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        buttonStyles.disc,
        isPrimary ? buttonStyles.primary : buttonStyles.glass,
        pressed ? buttonStyles.pressed : null,
      ]}
    >
      <Feather
        name={icon}
        size={16}
        color={isPrimary ? darkPalette.onPrimary : darkPalette.white}
      />
    </Pressable>
  );
}

const buttonStyles = StyleSheet.create({
  disc: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: darkPalette.primary },
  glass: {
    borderWidth: 1,
    borderColor: withAlpha(darkPalette.white, 0.7),
    backgroundColor: withAlpha(darkPalette.scrim, 0.6),
  },
  pressed: { opacity: 0.8 },
});
