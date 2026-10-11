import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, TextInput, View, type TextInputKeyPressEvent } from 'react-native';

import { noWebFocusOutline } from '@/components/ui/inputStyles';
import { useTranslation } from '@/i18n';
import { fontFamily, makeStyles, radius, spacing, typography } from '@/theme';

import { NavIconButton, NAV_ICON_BUTTON_SIZE } from './NavIconButton';
import type { NavTone } from './navTone';

/** Width of the expanded field; it grows to the left, so the icons on its right never move. */
export const NAV_SEARCH_WIDTH = 280;

export type NavSearchProps = {
  tone: NavTone;
  /** Called when the field opens / closes, so the bar can close the account menu or make room. */
  onOpenChange?: (isOpen: boolean) => void;
};

/** Magnifier that expands into a search field (Netflix style). Enter opens `/search?q=...`. */
export function NavSearch({ tone, onOpenChange }: NavSearchProps) {
  const { t } = useTranslation();
  const styles = useStyles();
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');

  const open = useCallback(() => {
    setIsOpen(true);
    onOpenChange?.(true);
  }, [onOpenChange]);
  const close = useCallback(() => {
    setIsOpen(false);
    setText('');
    onOpenChange?.(false);
  }, [onOpenChange]);
  const submit = useCallback(() => {
    const query = text.trim();
    if (query) router.navigate({ pathname: '/search', params: { q: query } });
  }, [text]);
  const handleKeyPress = useCallback(
    (event: TextInputKeyPressEvent) => {
      if (event.nativeEvent.key === 'Escape') close();
    },
    [close],
  );
  const handleBlur = useCallback(() => {
    if (!text.trim()) close();
  }, [text, close]);

  if (!isOpen) {
    return (
      <NavIconButton
        icon="search"
        accessibilityLabel={t('nav.openSearch')}
        tone={tone}
        onPress={open}
        testID="nav-search-open"
      />
    );
  }

  return (
    <View
      style={[
        styles.field,
        { backgroundColor: tone.fieldBackground, borderColor: tone.fieldBorder },
      ]}
      testID="nav-search-field"
    >
      <Feather name="search" size={18} color={tone.mutedColor} />
      <TextInput
        autoFocus
        value={text}
        onChangeText={setText}
        onSubmitEditing={submit}
        onKeyPress={handleKeyPress}
        onBlur={handleBlur}
        placeholder={t('nav.searchPlaceholder')}
        placeholderTextColor={tone.placeholder}
        accessibilityLabel={t('nav.searchLabel')}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        style={[styles.input, { color: tone.color }]}
        testID="nav-search-input"
      />
      {text ? (
        <Pressable
          onPress={() => setText('')}
          accessibilityRole="button"
          accessibilityLabel={t('nav.clearSearch')}
          hitSlop={8}
          style={styles.clear}
          testID="nav-search-clear"
        >
          <Feather name="x" size={16} color={tone.mutedColor} />
        </Pressable>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(() => ({
  field: {
    width: NAV_SEARCH_WIDTH,
    height: NAV_ICON_BUTTON_SIZE,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: radius.pill,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    fontFamily: fontFamily.body,
    fontSize: typography.body.fontSize,
    ...noWebFocusOutline,
  },
  clear: { cursor: 'pointer' },
}));
