import { useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { noWebFocusOutline } from '@/components/ui/inputStyles';
import { fontFamily, makeStyles, radius, spacing, typography, useTheme } from '@/theme';

import { OTP_LENGTH } from '../schemas';

export type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  /** Called once with the full code as soon as the last digit is in (typed or pasted). */
  onComplete?: (code: string) => void;
  /** Screen-reader label of the field ("Verification code"). */
  label: string;
  length?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  /** Red boxes after a wrong code. */
  hasError?: boolean;
  testID?: string;
};

/**
 * One-time-code entry: `length` separate boxes backed by ONE invisible text input. A single input
 * is what makes paste, SMS / email autofill (`oneTimeCode`), backspace and TalkBack / VoiceOver
 * work reliably, while the boxes only draw the digits and move the highlight ("auto advance").
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  label,
  length = OTP_LENGTH,
  autoFocus = false,
  disabled = false,
  hasError = false,
  testID,
}: OtpInputProps) {
  const { colors, isDark } = useTheme();
  const styles = useStyles();
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);
  const digits = value.replace(/\D/g, '').slice(0, length);
  const activeIndex = Math.min(digits.length, length - 1);

  const handleChange = (text: string) => {
    // A pasted "Your code is 123 456" keeps just the digits; typing past the end is ignored.
    const next = text.replace(/\D/g, '').slice(0, length);
    onChange(next);
    if (next.length === length && next !== digits) onComplete?.(next);
  };

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      accessible={false}
      style={styles.row}
      testID={testID}
    >
      {Array.from({ length }, (_, index) => {
        const isActive = isFocused && !disabled && index === activeIndex;
        return (
          <View
            key={index}
            style={[
              styles.box,
              isActive ? styles.boxActive : null,
              hasError ? styles.boxError : null,
              disabled ? styles.boxDisabled : null,
            ]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <AppText variant="h2" family="bodyBold" align="center" style={styles.digit}>
              {digits[index] ?? ''}
            </AppText>
          </View>
        );
      })}
      <TextInput
        ref={inputRef}
        value={digits}
        onChangeText={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        editable={!disabled}
        autoFocus={autoFocus}
        keyboardType="number-pad"
        inputMode="numeric"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        autoCorrect={false}
        caretHidden
        contextMenuHidden={false}
        selectionColor={colors.transparent}
        keyboardAppearance={isDark ? 'dark' : 'light'}
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        style={styles.input}
        testID={testID ? `${testID}-input` : undefined}
      />
    </Pressable>
  );
}

const BOX_HEIGHT = 56;

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  box: {
    flex: 1,
    maxWidth: 56,
    height: BOX_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.input - 2,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  // Accent ring on the box that receives the next digit (primaryText = AA-safe in both themes).
  boxActive: { borderColor: t.colors.primaryText, borderWidth: 2 },
  boxError: { borderColor: t.colors.danger },
  boxDisabled: { opacity: 0.5 },
  digit: { lineHeight: typography.h2.lineHeight },
  // Covers the whole row (taps, long-press paste) but draws nothing.
  input: {
    ...noWebFocusOutline,
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0.02,
    // Invisible on purpose: the boxes draw the digits and the focus (no browser ring, no text).
    outlineWidth: 0,
    borderWidth: 0,
    backgroundColor: t.colors.transparent,
    color: t.colors.transparent,
    fontFamily: fontFamily.body,
    fontSize: typography.body.fontSize,
  },
}));
