import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { FONT_B, GlassButton, NeonButton, PAD, T, usePaletteB } from './theme';
import { useConceptEnv } from '../shared/env';
import { formatHours, formatRating } from '../shared/format';
import { Icon } from '../shared/icons';
import { COURSES, PHOTO } from '../shared/mock';
import { Photo } from '../shared/Photo';

export const HERO_HEIGHT = 620;

/** Full-bleed featured course: the first thing the user sees. Doubles as the promo banner. */
export function Hero() {
  const p = usePaletteB();
  const { topInset } = useConceptEnv();
  const course = COURSES.uiux;
  const scrimEnd = p.isDark ? p.bg : 'rgba(13,13,18,0.96)';
  return (
    <View style={[styles.hero, p.isDark ? null : styles.heroRounded]}>
      <View style={styles.fill}>
        <Photo source={PHOTO.appIcons} width={1000} placeholderColor="#0E0E16" position="center" />
      </View>
      <LinearGradient
        colors={['rgba(8,8,12,0.65)', 'rgba(8,8,12,0)']}
        locations={[0, 1]}
        style={[styles.topScrim, { height: topInset + 90 }]}
      />
      <LinearGradient
        colors={['rgba(8,8,12,0)', 'rgba(8,8,12,0.72)', scrimEnd]}
        locations={[0, 0.5, 1]}
        style={styles.bottomScrim}
      />

      <View style={[styles.topBar, { paddingTop: topInset + 8 }]}>
        <View style={styles.wordmark}>
          <Text style={styles.wordmarkText}>elearn</Text>
          <View style={[styles.wordmarkDot, { backgroundColor: '#2EF2FF' }]} />
        </View>
        <View style={styles.topActions}>
          <GlassButton icon="search" label="Tìm kiếm" />
          <GlassButton icon="bell" label="Thông báo" />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.dots} accessibilityLabel="Nổi bật 1 trên 3">
          <View style={[styles.dotOn, { backgroundColor: '#2EF2FF' }]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
        <T v="hero" color="white">
          Thiết kế sản phẩm số từ con số 0
        </T>
        <View style={styles.meta}>
          <Icon name="star" size={15} color="#E9C77B" fill="#E9C77B" strokeWidth={1.5} />
          <T v="small" color="white">
            {formatRating(course.rating)}
          </T>
          <T v="small" color="whiteSoft">
            · {course.lessons} bài · {formatHours(course.hours)} · {course.teacher}
          </T>
        </View>
        <View style={styles.actions}>
          <NeonButton label="Học thử miễn phí" icon="play" iconFill style={styles.flex} />
          <GlassButton icon="plus" label="Thêm vào danh sách" size={52} />
          <GlassButton
            icon="sparkles"
            label="Hỏi AI về khóa học này"
            size={52}
            iconColor="#2EF2FF"
          />
        </View>
        <View style={styles.promo}>
          <Icon name="clock" size={15} color="#E9C77B" strokeWidth={2.2} />
          <T v="small" style={{ color: '#E9C77B' }}>
            Giảm 40% còn 2 ngày 14 giờ
          </T>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: HERO_HEIGHT, justifyContent: 'flex-end', overflow: 'hidden' },
  heroRounded: { borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  topScrim: { position: 'absolute', top: 0, left: 0, right: 0 },
  bottomScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 420 },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PAD,
  },
  wordmark: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  wordmarkText: {
    fontFamily: FONT_B.serifItalic,
    fontSize: 28,
    lineHeight: 34,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  wordmarkDot: { width: 7, height: 7, borderRadius: 4, marginBottom: 9 },
  topActions: { flexDirection: 'row', gap: 10 },
  content: { paddingHorizontal: PAD, paddingBottom: 26, gap: 14 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dotOn: { width: 26, height: 4, borderRadius: 2 },
  dot: { width: 6, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  flex: { flex: 1 },
  promo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
