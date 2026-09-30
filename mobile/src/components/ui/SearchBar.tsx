import Feather from '@expo/vector-icons/Feather';
import { useState, type Ref } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, fontFamily, radius, spacing, typography } from '@/theme';

export type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  /** Fired by the keyboard's search key. */
  onSubmit?: (text: string) => void;
  /** Fired when the clear (x) button is pressed, after the text is emptied. */
  onClear?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  style?: StyleProp<ViewStyle>;
  ref?: Ref<TextInput>;
};

/** Search input on a `surface` background with a magnifier icon and a clear button. */
export function SearchBar({
  value,
  onChangeText,
  onSubmit,
  onClear,
  placeholder = 'Search course',
  autoFocus,
  onFocus,
  onBlur,
  style,
  ref,
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <View style={[styles.container, isFocused ? styles.focused : null, style]}>
      <Feather name="search" size={18} color={colors.textPrimary} />
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={() => onSubmit?.(value)}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        accessibilityLabel={placeholder}
        style={styles.input}
        onFocus={() => {
          setIsFocused(true);
          onFocus?.();
        }}
        onBlur={() => {
          setIsFocused(false);
          onBlur?.();
        }}
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => {
            onChangeText('');
            onClear?.();
          }}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <Feather name="x-circle" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.transparent,
    backgroundColor: colors.surface,
  },
  focused: { borderColor: colors.primary },
  input: {
    flex: 1,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontFamily: fontFamily.body,
    fontSize: typography.body.fontSize,
  },
});
