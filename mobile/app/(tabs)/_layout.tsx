import Feather from '@expo/vector-icons/Feather';
import { Tabs } from 'expo-router/js-tabs';

import { FloatingTabBar } from '@/components/FloatingTabBar';
import type { FeatherIconName } from '@/components/ui/icons';
import { useTranslation } from '@/i18n';

type TabKey = 'home' | 'search' | 'myCourses' | 'profile';
type TabConfig = { name: string; titleKey: TabKey; icon: FeatherIconName };

const TABS: readonly TabConfig[] = [
  { name: 'index', titleKey: 'home', icon: 'home' },
  { name: 'search', titleKey: 'search', icon: 'search' },
  { name: 'my-courses', titleKey: 'myCourses', icon: 'book-open' },
  { name: 'profile', titleKey: 'profile', icon: 'user' },
];

/**
 * Bottom tabs: Home | Search | My Courses | Profile, drawn by the floating glass `FloatingTabBar`
 * (concept B): icons only, the active tab is a neon pill with its label.
 */
export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false }}>
      {TABS.map((tab) => {
        const title = t(`tabs.${tab.titleKey}`);
        return (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title,
              tabBarAccessibilityLabel: title,
              tabBarIcon: ({ color, size }) => (
                <Feather name={tab.icon} size={size} color={color} />
              ),
            }}
          />
        );
      })}
    </Tabs>
  );
}
