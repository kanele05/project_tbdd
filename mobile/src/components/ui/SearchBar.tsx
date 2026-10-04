import Feather from '@expo/vector-icons/Feather';
import { useCallback, useRef, useState, type Ref } from 'react';
import { Pressable, TextInput, type StyleProp, type ViewStyle } from 'react-native';

import { useTranslation } from '@/i18n';
import { fontFamily, makeStyles, radius, spacing, typography, useTheme } from '@/theme';

import { noWebFocusOutline } from './inputStyles';

export type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  /** Fired by the keyboard's search key. */
  onSubmit?: (text: string) => void;
  /** Fired when the clear (x) button is pressed, after the text is emptied. */
  onClear?: () => void;
  /** Default: the translated "Search course". */
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
  placeholder,
  autoFocus,
  onFocus,
  onBlur,
  style,
  ref,
}: SearchBarProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const styles = useStyles();
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput | null>(null);
  const resolvedPlaceholder = placeholder ?? t('search.placeholder');
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
    // The field is a 48 dp pill: the whole row focuses the input on press.
    <Pressable
      onPress={() => inputRef.current?.focus()}
      accessible={false}
      style={[styles.container, isFocused ? styles.focused : null, style]}
    >
      <Feather name="search" size={20} color={colors.textMuted} />
      <TextInput
        ref={setRefs}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={() => onSubmit?.(value)}
        placeholder={resolvedPlaceholder}
        placeholderTextColor={colors.placeholder}
        keyboardAppearance={isDark ? 'dark' : 'light'}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        accessibilityLabel={resolvedPlaceholder}
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
          hitSlop={14}
          accessibilityRole="button"
          accessibilityLabel={t('search.clear')}
        >
          <Feather name="x-circle" size={20} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const SEARCH_BAR_HEIGHT = 48;

const useStyles = makeStyles((t) => ({
  container: {
    height: SEARCH_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  focused: { borderColor: t.colors.primaryText },
  input: {
    ...noWebFocusOutline,
    flex: 1,
    alignSelf: 'stretch',
    paddingVertical: 0,
    color: t.colors.text,
    fontFamily: fontFamily.body,
    fontSize: typography.body.fontSize,
    // Android adds vertical padding to a TextInput; keep the text centered in the field.
    textAlignVertical: 'center',
  },
}));
