import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { GlassCard, GlassIconButton, GradOrb } from './parts';
import { PAD, T, usePaletteC } from './theme';
import { useConceptEnv } from '../shared/env';
import { Icon } from '../shared/icons';
import { USER } from '../shared/mock';
import { Photo } from '../shared/Photo';

/** Greeting row: gradient-ringed avatar, hello line, notification button. */
export function HomeHeader() {
  const p = usePaletteC();
  const { topInset } = useConceptEnv();
  return (
    <View style={[styles.header, { paddingTop: topInset + 12 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Hồ sơ của ${USER.name}`}>
        <LinearGradient
          colors={[p.glowTeal, p.glowViolet, p.glowPink]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ring}
        >
          <View style={[styles.avatar, { borderColor: p.bgSolid }]}>
            <Photo source={USER.avatar} width={160} placeholderColor={p.chip} position="top" />
          </View>
        </LinearGradient>
      </Pressable>
      <View style={styles.flex}>
        <T v="small" color="muted">
          Chào buổi sáng
        </T>
        <T v="h1">{USER.name}</T>
      </View>
      <GlassIconButton icon="bell" label="Thông báo, có 3 thông báo mới" hasBadge />
    </View>
  );
}

/** Glass search pill with an "AI search" shortcut on the right. */
export function SearchBar() {
  const p = usePaletteC();
  return (
    <View style={styles.searchWrap}>
      <GlassCard radius={30} contentStyle={styles.search}>
        <Pressable
          accessibilityRole="search"
          accessibilityLabel="Tìm khóa học, giảng viên, chủ đề"
          style={styles.searchMain}
        >
          <Icon name="search" size={22} color={p.muted} strokeWidth={2.2} />
          <T v="body" color="muted" numberOfLines={1} style={styles.flex}>
            Hôm nay bạn muốn học gì?
          </T>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Tìm kiếm bằng AI" hitSlop={4}>
          <GradOrb icon="sparkles" hue="violet" size={44} />
        </Pressable>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingHorizontal: PAD,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ring: { width: 58, height: 58, borderRadius: 29, padding: 3 },
  avatar: { flex: 1, borderRadius: 26, borderWidth: 2, overflow: 'hidden' },
  searchWrap: { paddingHorizontal: PAD, marginTop: 18 },
  search: {
    height: 60,
    paddingLeft: 6,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchMain: {
    flex: 1,
    minHeight: 48,
    paddingLeft: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
