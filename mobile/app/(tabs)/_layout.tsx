import Feather from '@expo/vector-icons/Feather';
import { Tabs } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabBarLabel } from '@/components/TabBarLabel';
import type { FeatherIconName } from '@/components/ui/icons';
import { STRINGS } from '@/constants/strings';
import { colors, layout } from '@/theme';

type TabConfig = { name: string; title: string; icon: FeatherIconName };

const TABS: readonly TabConfig[] = [
  { name: 'index', title: STRINGS.tabs.home, icon: 'home' },
  { name: 'search', title: STRINGS.tabs.search, icon: 'search' },
  { name: 'my-courses', title: STRINGS.tabs.myCourses, icon: 'book-open' },
  { name: 'profile', title: STRINGS.tabs.profile, icon: 'user' },
];

/** Bottom tabs: Home | Search | My Courses | Profile - active primary, inactive textSecondary. */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
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
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
        tabBarItemStyle: { minHeight: 48 },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarAccessibilityLabel: tab.title,
            tabBarLabel: ({ focused, color }) => (
              <TabBarLabel label={tab.title} focused={focused} color={color} />
            ),
            tabBarIcon: ({ focused, color }) => (
              <Feather name={tab.icon} size={24} color={focused ? colors.primary : color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
