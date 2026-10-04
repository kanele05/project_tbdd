import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { AiCard } from './ai';
import { AuroraBackground } from './Aurora';
import { PromoBanner } from './banner';
import { Categories, TeacherRail } from './browse';
import { ContinueRail } from './continue';
import { InspireRail, PopularRail, RecommendedList } from './courses';
import { GlassCard } from './parts';
import { T, usePaletteC } from './theme';
import { HomeHeader, SearchBar } from './top';
import { useConceptEnv } from '../shared/env';
import { Icon, type IconName } from '../shared/icons';
import { FakeStatusBar, ScreenShell } from '../shared/ScreenShell';

type Tab = { icon: IconName; label: string };

const LEFT_TABS: Tab[] = [
  { icon: 'home', label: 'Trang chủ' },
  { icon: 'compass', label: 'Khám phá' },
];
const RIGHT_TABS: Tab[] = [
  { icon: 'bookOpen', label: 'Khóa học' },
  { icon: 'user', label: 'Hồ sơ' },
];

function TabItem({ tab, isActive }: { tab: Tab; isActive: boolean }) {
  const p = usePaletteC();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={tab.label}
      style={styles.tab}
    >
      {isActive ? (
        <LinearGradient
          colors={[p.gradFrom, p.gradTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.activeDot}
        />
      ) : null}
      <Icon
        name={tab.icon}
        size={23}
        color={isActive ? p.violetText : p.muted}
        strokeWidth={isActive ? 2.5 : 2}
      />
      <T v="tiny" color={isActive ? 'violetText' : 'muted'} numberOfLines={1}>
        {tab.label}
      </T>
    </Pressable>
  );
}

/** Floating glass tab bar with a raised gradient AI button in the middle. */
export function TabBarC({ activeIndex }: { activeIndex: number }) {
  const { bottomInset } = useConceptEnv();
  return (
    <View style={[styles.tabWrap, { bottom: bottomInset + 4 }]}>
      <GlassCard radius={34} contentStyle={styles.tabBar}>
        {LEFT_TABS.map((tab, index) => (
          <TabItem key={tab.label} tab={tab} isActive={index === activeIndex} />
        ))}
        <View style={styles.centerGap} />
        {RIGHT_TABS.map((tab, index) => (
          <TabItem key={tab.label} tab={tab} isActive={index + 3 === activeIndex} />
        ))}
      </GlassCard>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="AI Tutor"
        style={({ pressed }) => [styles.aiFab, pressed ? styles.pressed : null]}
      >
        <LinearGradient
          colors={['#14B8A6', '#5B3DF0', '#C2185B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.aiFabFill}
        >
          <Icon name="sparkles" size={28} color="#FFFFFF" strokeWidth={2.2} />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

export function HomeScreenC() {
  const p = usePaletteC();
  return (
    <ScreenShell
      backgroundColor={p.bgSolid}
      background={<AuroraBackground />}
      footer={<TabBarC activeIndex={0} />}
    >
      <FakeStatusBar color={p.text} />
      <HomeHeader />
      <SearchBar />
      <PromoBanner />
      <ContinueRail />
      <Categories />
      <AiCard />
      <PopularRail />
      <RecommendedList />
      <InspireRail />
      <TeacherRail />
      <View style={styles.tail} />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  tail: { height: 120 },
  tabWrap: { position: 'absolute', left: 16, right: 16, pointerEvents: 'box-none' },
  tabBar: { height: 68, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center' },
  tab: {
    flex: 1,
    height: 56,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  activeDot: { position: 'absolute', top: 0, width: 22, height: 4, borderRadius: 2 },
  centerGap: { width: 72 },
  aiFab: {
    position: 'absolute',
    left: '50%',
    marginLeft: -32,
    top: -22,
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.85)',
    boxShadow: '0 10px 26px rgba(91,61,240,0.5)',
  },
  aiFabFill: {
    flex: 1,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.96 }] },
});
