import Feather from '@expo/vector-icons/Feather';
import { useState, type Ref } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { STRINGS } from '@/constants/strings';
import { colors, fontFamily, layout, radius, spacing, typography } from '@/theme';

import { AppText } from './AppText';
import type { FeatherIconName } from './icons';

export type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  /** Error message shown under the field (red border). */
  error?: string;
  /** Hint shown under the field when there is no error. */
  helperText?: string;
  leftIcon?: FeatherIconName;
  containerStyle?: StyleProp<ViewStyle>;
  ref?: Ref<TextInput>;
};

/**
 * Labeled text input. With `secureTextEntry` it shows an eye toggle to reveal the password.
 * Works with react-hook-form via `<Controller>` (value / onChangeText / onBlur / error).
 */
export function TextField({
  label,
  error,
  helperText,
  leftIcon,
  secureTextEntry,
  containerStyle,
  onFocus,
  onBlur,
  editable = true,
  ref,
  ...inputProps
}: TextFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const isSecure = Boolean(secureTextEntry) && !isRevealed;
  const hasError = Boolean(error);

  return (
    <View style={containerStyle}>
      {label ? (
        <AppText variant="label" style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <View
        style={[
          styles.inputWrap,
          isFocused ? styles.focused : null,
          hasError ? styles.errored : null,
          !editable ? styles.readOnly : null,
        ]}
      >
        {leftIcon ? (
          <Feather name={leftIcon} size={18} color={colors.textMuted} style={styles.leftIcon} />
        ) : null}
        <TextInput
          ref={ref}
          {...inputProps}
          editable={editable}
          secureTextEntry={isSecure}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={inputProps.accessibilityLabel ?? label}
          accessibilityState={{ disabled: !editable }}
          style={styles.input}
          onFocus={(event) => {
            setIsFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setIsFocused(false);
            onBlur?.(event);
          }}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setIsRevealed((value) => !value)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={isRevealed ? STRINGS.auth.hidePassword : STRINGS.auth.showPassword}
            style={styles.toggle}
          >
            <Feather name={isRevealed ? 'eye-off' : 'eye'} size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {hasError ? (
        <AppText
          variant="caption"
          color="danger"
          style={styles.message}
          accessibilityLiveRegion="polite"
        >
          {error}
        </AppText>
      ) : helperText ? (
        <AppText variant="caption" style={styles.message}>
          {helperText}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: spacing.sm },
  inputWrap: {
    minHeight: layout.inputHeight,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.transparent,
    paddingHorizontal: spacing.lg,
  },
  focused: { borderColor: colors.primary, backgroundColor: colors.background },
  errored: { borderColor: colors.danger, backgroundColor: colors.background },
  readOnly: { opacity: 0.7 },
  leftIcon: { marginRight: spacing.sm },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontFamily: fontFamily.body,
    fontSize: typography.body.fontSize,
  },
  toggle: { marginLeft: spacing.sm, padding: spacing.xs },
  message: { marginTop: spacing.xs },
});
