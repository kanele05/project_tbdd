import { Pressable, StyleSheet, View } from 'react-native';

import { AiPanel } from './ai';
import { Hero } from './hero';
import {
  ContinueRail,
  InspireRail,
  RecommendedRail,
  TeacherRail,
  TopicChips,
  TopTen,
} from './rails';
import { T, usePaletteB } from './theme';
import { useConceptEnv } from '../shared/env';
import { Glass } from '../shared/Glass';
import { Icon, type IconName } from '../shared/icons';
import { FakeStatusBar, ScreenShell } from '../shared/ScreenShell';

const TABS: { icon: IconName; label: string }[] = [
  { icon: 'home', label: 'Trang chủ' },
  { icon: 'compass', label: 'Khám phá' },
  { icon: 'bookOpen', label: 'Của tôi' },
  { icon: 'sparkles', label: 'AI' },
  { icon: 'user', label: 'Hồ sơ' },
];

/** Floating frosted tab bar; only the active tab shows its label. */
export function TabBarB({ activeIndex }: { activeIndex: number }) {
  const p = usePaletteB();
  const { bottomInset } = useConceptEnv();
  return (
    <View style={[styles.tabWrap, { bottom: bottomInset + 4 }]}>
      <Glass
        intensity={50}
        tint={p.isDark ? 'dark' : 'light'}
        fill={p.isDark ? 'rgba(19,19,26,0.82)' : 'rgba(255,255,255,0.86)'}
        borderColor={p.isDark ? 'rgba(255,255,255,0.14)' : 'rgba(13,13,18,0.1)'}
        radius={32}
        shadow="0 12px 32px rgba(0,0,0,0.35)"
        contentStyle={styles.tabBar}
      >
        {TABS.map((tab, index) => {
          const isActive = index === activeIndex;
          return (
            <Pressable
              key={tab.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
              style={[
                styles.tab,
                isActive ? { backgroundColor: p.neon, paddingHorizontal: 16 } : { width: 52 },
              ]}
            >
              <Icon
                name={tab.icon}
                size={22}
                color={isActive ? p.onNeon : p.muted}
                strokeWidth={isActive ? 2.5 : 2}
              />
              {isActive ? (
                <T v="tiny" color="onNeon" numberOfLines={1}>
                  {tab.label}
                </T>
              ) : null}
            </Pressable>
          );
        })}
      </Glass>
    </View>
  );
}

export function HomeScreenB() {
  const p = usePaletteB();
  return (
    <ScreenShell backgroundColor={p.bg} footer={<TabBarB activeIndex={0} />}>
      <FakeStatusBar color="#FFFFFF" />
      <Hero />
      <ContinueRail />
      <TopicChips />
      <TopTen />
      <AiPanel />
      <RecommendedRail />
      <InspireRail />
      <TeacherRail />
      <View style={styles.tail} />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  tail: { height: 120 },
  tabWrap: { position: 'absolute', left: 16, right: 16, pointerEvents: 'box-none' },
  tabBar: {
    height: 64,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tab: {
    height: 48,
    minWidth: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});
