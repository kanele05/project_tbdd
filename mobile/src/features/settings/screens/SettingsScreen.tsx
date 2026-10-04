import Feather from '@expo/vector-icons/Feather';
import { Pressable, ScrollView, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { API_URL, APP_VERSION } from '@/constants/config';
import { useConfirmLogout } from '@/features/auth/useConfirmLogout';
import { useTranslation, type LanguagePreference } from '@/i18n';
import { useLanguage } from '@/i18n/useLanguage';
import { useAuthStore } from '@/stores/authStore';
import { layout, makeStyles, spacing, useTheme, type ThemeMode } from '@/theme';

import { OptionRow } from '../components/OptionRow';
import { SettingsSection } from '../components/SettingsSection';

const LANGUAGE_OPTIONS: readonly LanguagePreference[] = ['system', 'vi', 'en'];
const THEME_OPTIONS: readonly ThemeMode[] = ['system', 'light', 'dark'];

type InfoRowProps = { label: string; value: string };

function InfoRow({ label, value }: InfoRowProps) {
  const styles = useStyles();
  return (
    <View style={styles.infoRow} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="body">{label}</AppText>
      <AppText variant="body" color="textSecondary" numberOfLines={1} style={styles.infoValue}>
        {value}
      </AppText>
    </View>
  );
}

/** UI-05 Settings: language, appearance (system / light / dark), app info and log out. */
export function SettingsScreen() {
  const { t } = useTranslation(['settings', 'common', 'auth']);
  const { colors, mode, setMode } = useTheme();
  const { preference, setPreference } = useLanguage();
  const user = useAuthStore((state) => state.user);
  const confirmLogout = useConfirmLogout();
  const styles = useStyles();

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
          {user ? <InfoRow label={t('account.signedInAs')} value={user.email} /> : null}
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

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  content: {
    gap: spacing.xxl,
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
  },
  infoRow: {
    minHeight: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  infoValue: { flexShrink: 1 },
  logoutRow: {
    minHeight: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  pressed: { backgroundColor: t.colors.surfaceAlt },
}));
