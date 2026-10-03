import Feather from '@expo/vector-icons/Feather';
import { useCallback, useRef, useState, type Ref } from 'react';
import { Pressable, StyleSheet, TextInput, type StyleProp, type ViewStyle } from 'react-native';

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
  const inputRef = useRef<TextInput | null>(null);
  // Forward the TextInput to the caller's ref while keeping our own handle for `focus()`.
  const setRefs = useCallback(
    (node: TextInput | null) => {
      inputRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );
  return (
    // The field is 36 dp tall (design); `hitSlop` + focusing on press keep a 48 dp touch target.
    <Pressable
      onPress={() => inputRef.current?.focus()}
      hitSlop={{ top: 6, bottom: 6 }}
      accessible={false}
      style={[styles.container, isFocused ? styles.focused : null, style]}
    >
      <Feather name="search" size={18} color={colors.textPrimary} />
      <TextInput
        ref={setRefs}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={() => onSubmit?.(value)}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
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
          hitSlop={15}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <Feather name="x-circle" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const SEARCH_BAR_HEIGHT = 36;

const styles = StyleSheet.create({
  container: {
    height: SEARCH_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    // Design: the text starts 4 dp after the 18 dp magnifier.
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.transparent,
    backgroundColor: colors.surface,
  },
  focused: { borderColor: colors.primary },
  input: {
    flex: 1,
    alignSelf: 'stretch',
    paddingVertical: 0,
    color: colors.textPrimary,
    fontFamily: fontFamily.body,
    fontSize: typography.body.fontSize,
    // Android adds vertical padding to a TextInput; keep the text centered in the 36 dp field.
    textAlignVertical: 'center',
  },
});
