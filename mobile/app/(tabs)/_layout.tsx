import Feather from '@expo/vector-icons/Feather';
import { Tabs } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabBarLabel } from '@/components/TabBarLabel';
import type { FeatherIconName } from '@/components/ui/icons';
import { useTranslation } from '@/i18n';
import { layout, useTheme } from '@/theme';

type TabKey = 'home' | 'search' | 'myCourses' | 'profile';
type TabConfig = { name: string; titleKey: TabKey; icon: FeatherIconName };

const TABS: readonly TabConfig[] = [
  { name: 'index', titleKey: 'home', icon: 'home' },
  { name: 'search', titleKey: 'search', icon: 'search' },
  { name: 'my-courses', titleKey: 'myCourses', icon: 'book-open' },
  { name: 'profile', titleKey: 'profile', icon: 'user' },
];

/** Bottom tabs: Home | Search | My Courses | Profile - active primary, inactive textSecondary. */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Label text uses the AA-safe `primaryText`; the icon keeps the brand `primary`.
        tabBarActiveTintColor: colors.primaryText,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarHideOnKeyboard: true,
        tabBarLabelPosition: 'below-icon',
        tabBarStyle: {
          height: layout.tabBarHeight + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom + 8,
          backgroundColor: colors.tabBar,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
        tabBarItemStyle: { minHeight: 48 },
      }}
    >
      {TABS.map((tab) => {
        const title = t(`tabs.${tab.titleKey}`);
        return (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title,
              tabBarAccessibilityLabel: title,
              tabBarLabel: ({ focused, color }) => (
                <TabBarLabel label={title} focused={focused} color={color} />
              ),
              tabBarIcon: ({ focused, color }) => (
                <Feather name={tab.icon} size={24} color={focused ? colors.primary : color} />
              ),
            }}
          />
        );
      })}
    </Tabs>
  );
}
