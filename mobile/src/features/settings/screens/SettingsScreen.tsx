import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { CinematicHeader } from '@/components/ui/CinematicHeader';
import { API_URL, APP_VERSION } from '@/constants/config';
import { useConfirmLogout } from '@/features/auth/useConfirmLogout';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTranslation, type LanguagePreference } from '@/i18n';
import { useLanguage } from '@/i18n/useLanguage';
import { useAuthStore } from '@/stores/authStore';
import { layout, makeStyles, spacing, useTheme, type ThemeMode } from '@/theme';

import { SettingsDesktop } from '../components/desktop/SettingsDesktop';
import { InfoRow } from '../components/InfoRow';
import { NavRow } from '../components/NavRow';
import { OptionRow } from '../components/OptionRow';
import { SettingsSection } from '../components/SettingsSection';

const LANGUAGE_OPTIONS: readonly LanguagePreference[] = ['system', 'vi', 'en'];
const THEME_OPTIONS: readonly ThemeMode[] = ['system', 'light', 'dark'];

/** UI-05 Settings: language, appearance (system / light / dark), app info and log out. */
function SettingsPhoneScreen() {
  const { t } = useTranslation(['settings', 'common', 'auth']);
  const { colors, mode, setMode } = useTheme();
  const { preference, setPreference } = useLanguage();
  const user = useAuthStore((state) => state.user);
  const confirmLogout = useConfirmLogout();
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <CinematicHeader title={t('title')} posterIndex={9} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxxl }]}
        showsVerticalScrollIndicator={false}
        testID="settings-scroll"
      >
        <SettingsSection title={t('language.title')} isRadioGroup>
          {LANGUAGE_OPTIONS.map((option) => (
            <OptionRow
              key={option}
              label={t(`language.${option}`)}
              isSelected={preference === option}
              onPress={() => setPreference(option)}
              testID={`language-${option}`}
            />
          ))}
        </SettingsSection>

        <SettingsSection title={t('appearance.title')} isRadioGroup>
          {THEME_OPTIONS.map((option) => (
            <OptionRow
              key={option}
              label={t(`appearance.${option}`)}
              isSelected={mode === option}
              onPress={() => setMode(option)}
              testID={`theme-${option}`}
            />
          ))}
        </SettingsSection>

        <SettingsSection title={t('about.title')}>
          <InfoRow label={t('about.appName')} value={t('common:appName')} />
          <InfoRow label={t('about.version')} value={APP_VERSION} />
          <InfoRow label={t('about.api')} value={API_URL} />
        </SettingsSection>

        <SettingsSection title={t('account.title')}>
          {user ? <InfoRow label={t('account.signedInAs')} value={user.email} isStacked /> : null}
          <NavRow
            icon="shield"
            label={t('security.row')}
            hint={t('security.rowHint')}
            onPress={() => router.push('/settings/security')}
            testID="settings-security"
          />
          <Pressable
            onPress={() => void confirmLogout()}
            accessibilityRole="button"
            accessibilityLabel={t('auth:logout')}
            testID="settings-logout"
            style={({ pressed }) => [styles.logoutRow, pressed ? styles.pressed : null]}
          >
            <Feather name="log-out" size={20} color={colors.danger} />
            <AppText variant="body" color="dangerText" family="bodyMedium">
              {t('auth:logout')}
            </AppText>
          </Pressable>
        </SettingsSection>
      </ScrollView>
    </View>
  );
}

/** UI-05 Settings; on a PC window (PLAN §2.5) an account-settings layout with a section menu. */
export function SettingsScreen() {
  const { isWide } = useBreakpoint();
  return isWide ? <SettingsDesktop /> : <SettingsPhoneScreen />;
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  content: {
    gap: spacing.xxl,
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
  },
  logoutRow: {
    minHeight: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  pressed: { backgroundColor: t.colors.surfaceAlt },
}));
