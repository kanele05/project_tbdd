import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/i18n';
import { fontFamily, layout, makeStyles, radius, spacing, typography, useTheme } from '@/theme';

import { AI_CHAT_MAX_LENGTH } from '../chatConfig';

export type TutorComposerProps = {
  /** Sends the text; resolves `true` when it was accepted (the field is then emptied). */
  onSend: (text: string) => Promise<boolean>;
  /** An answer is being written: typing stays possible, sending does not. */
  isBusy: boolean;
  /** Rate limit countdown in seconds (0 = free to ask). */
  cooldownSec: number;
  /** Bottom safe-area padding; pass 0 when a tab bar / keyboard already covers it. */
  hasBottomInset?: boolean;
};

/** Counter appears once the text gets close to the 1000-character limit. */
const COUNTER_THRESHOLD = 800;

/**
 * The AI Tutor input: a pill field that grows up to four lines and a 48 dp neon send button (the
 * one neon action of the screen). The disclaimer sits under it. While an answer streams or a rate
 * limit counts down the send button is disabled instead of hidden, and the reason is said.
 */
export function TutorComposer({
  onSend,
  isBusy,
  cooldownSec,
  hasBottomInset = true,
}: TutorComposerProps) {
  const { t } = useTranslation('ai');
  const { colors, isDark } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const canSend = text.trim().length > 0 && !isBusy && cooldownSec === 0;

  const submit = async () => {
    if (!canSend) return;
    const message = text;
    setText('');
    const isAccepted = await onSend(message);
    // Keep what the user wrote when the request could not even start (e.g. offline).
    if (!isAccepted) setText((current) => (current === '' ? message : current));
  };

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: (hasBottomInset ? insets.bottom : 0) + spacing.sm },
      ]}
    >
      {cooldownSec > 0 ? (
        <AppText variant="caption" color="dangerText" accessibilityLiveRegion="polite">
          {t('tutor.retryIn', { seconds: cooldownSec })}
        </AppText>
      ) : null}
      <View style={[styles.field, isFocused ? styles.fieldFocused : null]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t('tutor.placeholder')}
          placeholderTextColor={colors.placeholder}
          keyboardAppearance={isDark ? 'dark' : 'light'}
          accessibilityLabel={t('tutor.inputLabel')}
          multiline
          numberOfLines={1}
          maxLength={AI_CHAT_MAX_LENGTH}
          style={styles.input}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          testID="tutor-input"
        />
        <Pressable
          onPress={() => void submit()}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel={t('tutor.send')}
          accessibilityState={{ disabled: !canSend, busy: isBusy }}
          style={[styles.send, canSend ? styles.sendActive : styles.sendIdle]}
          testID="tutor-send"
        >
          <Feather
            name="arrow-up"
            size={22}
            color={canSend ? colors.onPrimary : colors.textMuted}
          />
        </Pressable>
      </View>
      <View style={styles.footer}>
        <AppText variant="micro" color="textMuted" style={styles.disclaimer}>
          {t('disclaimer')}
        </AppText>
        {text.length >= COUNTER_THRESHOLD ? (
          <AppText
            variant="micro"
            color={text.length >= AI_CHAT_MAX_LENGTH ? 'dangerText' : 'textMuted'}
            accessibilityLabel={t('tutor.characters', {
              count: text.length,
              max: AI_CHAT_MAX_LENGTH,
            })}
          >
            {`${text.length}/${AI_CHAT_MAX_LENGTH}`}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const SEND_SIZE = layout.minTouchTarget;

const useStyles = makeStyles((t) => ({
  container: {
    gap: spacing.sm,
    paddingTop: spacing.md,
    paddingHorizontal: layout.screenPaddingX,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
    backgroundColor: t.colors.background,
  },
  field: {
    minHeight: SEND_SIZE + spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  fieldFocused: { borderColor: t.colors.primaryText },
  input: {
    flex: 1,
    maxHeight: 112,
    minHeight: SEND_SIZE - spacing.xs,
    paddingVertical: spacing.md - 1,
    color: t.colors.text,
    fontFamily: fontFamily.body,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
  },
  send: {
    width: SEND_SIZE,
    height: SEND_SIZE,
    borderRadius: SEND_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendActive: { backgroundColor: t.colors.primary },
  sendIdle: { backgroundColor: t.colors.border },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  disclaimer: { flex: 1 },
}));
