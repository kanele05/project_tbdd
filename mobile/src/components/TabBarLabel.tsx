import type { ColorValue } from 'react-native';

import { AppText } from '@/components/ui/AppText';

type TabBarLabelProps = { label: string; focused: boolean; color: ColorValue };

/** Bottom tab label: Inter Medium, bold (semibold) when active - as in the design. */
export function TabBarLabel({ label, focused, color }: TabBarLabelProps) {
  return (
    <AppText
      variant="micro"
      family={focused ? 'bodySemiBold' : 'bodyMedium'}
      style={{ color }}
      numberOfLines={1}
    >
      {label}
    </AppText>
  );
}
