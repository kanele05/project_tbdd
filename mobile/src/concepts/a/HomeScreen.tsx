import { Pressable, StyleSheet, View } from 'react-native';

import { AiCard, ContinueCard, HomeHeader, PromoBanner, StreakCard } from './blocks';
import { Categories, InspireRail, PopularRail, RecommendedList, TeacherRail } from './rails';
import { T, usePaletteA } from './theme';
import { useConceptEnv } from '../shared/env';
import { Icon, type IconName } from '../shared/icons';
import { FakeStatusBar, ScreenShell } from '../shared/ScreenShell';

const TABS: { icon: IconName; label: string }[] = [
  { icon: 'home', label: 'Trang chủ' },
  { icon: 'compass', label: 'Khám phá' },
  { icon: 'bookOpen', label: 'Khóa học' },
  { icon: 'trophy', label: 'Thành tích' },
  { icon: 'user', label: 'Hồ sơ' },
];

/** Sticky bottom tab bar with a chunky top edge; the active tab sits in a tinted pill. */
export function TabBarA({ activeIndex }: { activeIndex: number }) {
  const p = usePaletteA();
  const { bottomInset } = useConceptEnv();
  return (
    <View
      style={[
        styles.tabBar,
        { backgroundColor: p.tabBg, borderTopColor: p.cardBorder, paddingBottom: bottomInset },
      ]}
    >
      {TABS.map((tab, index) => {
        const isActive = index === activeIndex;
        return (
          <Pressable
            key={tab.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
            style={styles.tab}
          >
            <View
              style={[
                styles.tabPill,
                isActive ? { backgroundColor: p.primaryTint, borderColor: p.primary } : null,
              ]}
            >
              <Icon
                name={tab.icon}
                size={24}
                color={isActive ? p.primaryText : p.muted}
                strokeWidth={isActive ? 2.6 : 2.2}
              />
            </View>
            <T v="tiny" color={isActive ? 'primaryText' : 'muted'} numberOfLines={1}>
              {tab.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

export function HomeScreenA() {
  const p = usePaletteA();
  return (
    <ScreenShell backgroundColor={p.bg} footer={<TabBarA activeIndex={0} />}>
      <FakeStatusBar color={p.text} />
      <HomeHeader />
      <ContinueCard />
      <StreakCard />
      <AiCard />
      <Categories />
      <View style={styles.promoGap} />
      <PromoBanner />
      <PopularRail />
      <RecommendedList />
      <InspireRail />
      <TeacherRail />
      <View style={styles.tail} />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  promoGap: { height: 8 },
  tail: { height: 112 },
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    paddingTop: 8,
    paddingHorizontal: 8,
    borderTopWidth: 2,
  },
  tab: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabPill: {
    width: 56,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
