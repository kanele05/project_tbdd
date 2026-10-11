import Feather from '@expo/vector-icons/Feather';
import { Redirect, usePathname } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useMemo } from 'react';

import { FloatingTabBar } from '@/components/FloatingTabBar';
import { ALL_TABS, getTabsForRole, isForbiddenTabPath } from '@/components/tabsForRole';
import { useTranslation } from '@/i18n';
import { useAuthStore } from '@/stores/authStore';

/**
 * Bottom tabs, drawn by the floating glass `FloatingTabBar` (concept B): icons only, the active
 * tab is a neon pill with its label. Everyone gets Home | Search | My Courses | Profile; a Teacher
 * also gets "Teaching" (Studio) and an Admin "Admin" as a fifth tab (PLAN §2.4.7). All six routes
 * are registered, the bar only draws the ones of the current role, and a role-only tab opened by
 * URL without that role redirects to Home.
 */
export default function TabsLayout() {
  const { t } = useTranslation();
  const role = useAuthStore((state) => state.user?.role);
  const pathname = usePathname();
  const visibleNames = useMemo(() => getTabsForRole(role).map((tab) => tab.name), [role]);

  if (isForbiddenTabPath(pathname, role)) return <Redirect href="/(tabs)" />;

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} visibleRouteNames={visibleNames} />}
      screenOptions={{ headerShown: false }}
    >
      {ALL_TABS.map((tab) => {
        const title = t(`tabs.${tab.titleKey}`);
        const isVisible = visibleNames.includes(tab.name);
        return (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title,
              tabBarAccessibilityLabel: title,
              // `href: null` keeps a hidden tab out of any default tab bar and out of the web links.
              ...(isVisible ? {} : { href: null }),
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
