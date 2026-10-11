import { useLocalSearchParams } from 'expo-router';
import { Children, Fragment, type ReactNode } from 'react';
import { View } from 'react-native';

import { WorkPanel } from '@/components/layout/work';
import { AppText } from '@/components/ui/AppText';
import { API_URL, APP_VERSION } from '@/constants/config';
import { useTranslation, type LanguagePreference } from '@/i18n';
import { useLanguage } from '@/i18n/useLanguage';
import { useAuthStore } from '@/stores/authStore';
import { makeStyles, radius, spacing, useTheme, type ThemeMode } from '@/theme';

import { InfoRow } from '../InfoRow';
import { OptionRow } from '../OptionRow';
import { SettingsDesktopShell, type SettingsSectionKey } from './SettingsDesktopShell';

const LANGUAGE_OPTIONS: readonly LanguagePreference[] = ['system', 'vi', 'en'];
const THEME_OPTIONS: readonly ThemeMode[] = ['system', 'light', 'dark'];
const SECTIONS: readonly SettingsSectionKey[] = ['appearance', 'language', 'about'];

function parseSection(value: string | string[] | undefined): SettingsSectionKey {
  const first = Array.isArray(value) ? value[0] : value;
  return SECTIONS.find((section) => section === first) ?? 'appearance';
}

/** Bordered list of rows separated by hairlines (the options of one section). */
function RowList({
  children,
  isRadioGroup = false,
}: {
  children: ReactNode;
  isRadioGroup?: boolean;
}) {
  const styles = useStyles();
  return (
    <View style={styles.list} accessibilityRole={isRadioGroup ? 'radiogroup' : undefined}>
      {Children.toArray(children).map((row, index) => (
        <Fragment key={index}>
          {index > 0 ? <View style={styles.divider} /> : null}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

function AppearancePanel() {
  const { t } = useTranslation('settings');
  const { mode, setMode } = useTheme();
  return (
    <WorkPanel title={t('appearance.title')} testID="settings-panel-appearance">
      <AppText color="textSecondary">{t('desktop.appearanceHint')}</AppText>
      <RowList isRadioGroup>
        {THEME_OPTIONS.map((option) => (
          <OptionRow
            key={option}
            label={t(`appearance.${option}`)}
            isSelected={mode === option}
            onPress={() => setMode(option)}
            testID={`theme-${option}`}
          />
        ))}
      </RowList>
    </WorkPanel>
  );
}

function LanguagePanel() {
  const { t } = useTranslation('settings');
  const { preference, setPreference } = useLanguage();
  return (
    <WorkPanel title={t('language.title')} testID="settings-panel-language">
      <AppText color="textSecondary">{t('desktop.languageHint')}</AppText>
      <RowList isRadioGroup>
        {LANGUAGE_OPTIONS.map((option) => (
          <OptionRow
            key={option}
            label={t(`language.${option}`)}
            isSelected={preference === option}
            onPress={() => setPreference(option)}
            testID={`language-${option}`}
          />
        ))}
      </RowList>
    </WorkPanel>
  );
}

function AboutPanel() {
  const { t } = useTranslation(['settings', 'common']);
  const user = useAuthStore((state) => state.user);
  return (
    <WorkPanel title={t('settings:about.title')} testID="settings-panel-about">
      <AppText color="textSecondary">{t('settings:desktop.aboutHint')}</AppText>
      <RowList>
        <InfoRow label={t('settings:about.appName')} value={t('common:appName')} />
        <InfoRow label={t('settings:about.version')} value={APP_VERSION} />
        <InfoRow label={t('settings:about.api')} value={API_URL} />
        {user ? (
          <InfoRow label={t('settings:account.signedInAs')} value={user.email} isStacked />
        ) : null}
      </RowList>
    </WorkPanel>
  );
}

/**
 * Settings on a PC window: a section menu and the content of the section chosen in
 * `?section=` (appearance, language, about). Security has its own route.
 */
export function SettingsDesktop() {
  const { t } = useTranslation('settings');
  const { section } = useLocalSearchParams<{ section?: string | string[] }>();
  const active = parseSection(section);
  return (
    <SettingsDesktopShell active={active} title={t('title')} subtitle={t('desktop.subtitle')}>
      {active === 'appearance' ? <AppearancePanel /> : null}
      {active === 'language' ? <LanguagePanel /> : null}
      {active === 'about' ? <AboutPanel /> : null}
    </SettingsDesktopShell>
  );
}

const useStyles = makeStyles((t) => ({
  list: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: radius.card,
    backgroundColor: t.colors.card,
  },
  divider: { height: 1, marginHorizontal: spacing.lg, backgroundColor: t.colors.borderSubtle },
}));
