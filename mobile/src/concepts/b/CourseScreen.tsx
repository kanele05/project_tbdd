import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { GlassButton, NeonButton, PAD, T, usePaletteB } from './theme';
import { useConceptEnv } from '../shared/env';
import {
  discountPercent,
  formatCount,
  formatHours,
  formatRating,
  formatUsd,
} from '../shared/format';
import { Glass } from '../shared/Glass';
import { Icon } from '../shared/icons';
import { DETAIL, PHOTO, portraitUrl } from '../shared/mock';
import { Photo } from '../shared/Photo';
import { FakeStatusBar, ScreenShell } from '../shared/ScreenShell';

const HERO_H = 470;

function CourseHero() {
  const p = usePaletteB();
  const { topInset } = useConceptEnv();
  const { course } = DETAIL;
  const scrimEnd = p.isDark ? p.bg : 'rgba(13,13,18,0.96)';
  return (
    <View style={[styles.hero, p.isDark ? null : styles.heroRounded]}>
      <View style={StyleSheet.absoluteFill}>
        <Photo source={PHOTO.codeJs} width={1000} placeholderColor="#0E0E16" />
      </View>
      <LinearGradient
        colors={['rgba(8,8,12,0.7)', 'rgba(8,8,12,0)']}
        style={[styles.topScrim, { height: topInset + 90 }]}
      />
      <LinearGradient
        colors={['rgba(8,8,12,0)', 'rgba(8,8,12,0.78)', scrimEnd]}
        locations={[0, 0.55, 1]}
        style={styles.bottomScrim}
      />
      <View style={[styles.topBar, { paddingTop: topInset + 8 }]}>
        <GlassButton icon="chevronLeft" label="Quay lại" />
        <View style={styles.row}>
          <GlassButton icon="share" label="Chia sẻ" />
          <GlassButton icon="heart" label="Yêu thích" />
        </View>
      </View>
      <View style={styles.playWrap}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Xem giới thiệu khóa học, 3 phút 20 giây"
          style={styles.playRing}
        >
          <View style={[styles.playCore, { backgroundColor: p.neon }]}>
            <Icon name="play" size={26} color={p.onNeon} fill={p.onNeon} />
          </View>
        </Pressable>
        <T v="small" color="white">
          Xem giới thiệu · 3:20
        </T>
      </View>
      <View style={styles.heroText}>
        <View style={[styles.badge, { backgroundColor: p.gold }]}>
          <T v="tiny" style={{ color: '#1A1203' }}>
            Bán chạy · {course.category}
          </T>
        </View>
        <T v="hero" color="white" style={styles.title}>
          {course.title}
        </T>
        <View style={styles.row}>
          <Icon name="star" size={15} color="#E9C77B" fill="#E9C77B" strokeWidth={1.5} />
          <T v="small" color="white">
            {formatRating(course.rating)}
          </T>
          <T v="small" color="whiteSoft">
            ({formatCount(course.ratingCount)}) · {formatCount(course.students)} học viên
          </T>
        </View>
      </View>
    </View>
  );
}

function TeacherLine() {
  const p = usePaletteB();
  const { course } = DETAIL;
  return (
    <View style={styles.teacher}>
      <View style={[styles.avatar, { borderColor: p.accentText }]}>
        <Photo source={portraitUrl('men', 32)} width={120} placeholderColor={p.surface2} />
      </View>
      <View style={styles.flex}>
        <T v="h3">{course.teacher}</T>
        <T v="small" color="muted">
          {course.teacherJob}
        </T>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Theo dõi ${course.teacher}`}
        style={[styles.follow, { borderColor: p.hairline }]}
      >
        <T v="small">Theo dõi</T>
      </Pressable>
    </View>
  );
}

function Tabs() {
  const p = usePaletteB();
  return (
    <View style={[styles.tabs, { borderBottomColor: p.hairline }]} accessibilityRole="tablist">
      {DETAIL.tabs.map((tab, index) => {
        const isActive = index === 0;
        return (
          <Pressable
            key={tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            style={[styles.tab, isActive ? { borderBottomColor: p.neon } : null]}
          >
            <T v="h3" color={isActive ? 'text' : 'muted'} numberOfLines={1}>
              {tab}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

function Facts() {
  const p = usePaletteB();
  const { course } = DETAIL;
  const facts = [
    { value: String(course.lessons), label: 'bài học' },
    { value: formatHours(course.hours), label: 'tổng thời lượng' },
    { value: 'Mọi cấp', label: 'trình độ' },
  ];
  return (
    <View style={[styles.facts, { borderColor: p.hairline }]}>
      {facts.map((fact, index) => (
        <View
          key={fact.label}
          style={[
            styles.fact,
            index > 0 ? { borderLeftColor: p.hairline, borderLeftWidth: 1 } : null,
          ]}
        >
          <T v="h1" style={styles.factValue}>
            {fact.value}
          </T>
          <T v="small" color="muted">
            {fact.label}
          </T>
        </View>
      ))}
    </View>
  );
}

function Overview() {
  const p = usePaletteB();
  return (
    <View style={styles.overview}>
      <T v="body" color="muted">
        {DETAIL.description}
      </T>
      <T v="h2">Bạn sẽ học được</T>
      <View style={styles.benefits}>
        {DETAIL.benefits.map((benefit) => (
          <View key={benefit} style={styles.benefit}>
            <Icon name="check" size={18} color={p.accentText} strokeWidth={2.6} />
            <View style={styles.flex}>
              <T v="body">{benefit}</T>
            </View>
          </View>
        ))}
      </View>
      <View style={[styles.aiRow, { backgroundColor: p.surface, borderColor: p.hairline }]}>
        <View style={[styles.aiOrb, { backgroundColor: p.neon }]}>
          <Icon name="sparkles" size={20} color={p.onNeon} strokeWidth={2.2} />
        </View>
        <View style={styles.flex}>
          <T v="h3">Hỏi AI Tutor về khóa học này</T>
          <T v="small" color="muted">
            Tóm tắt, gợi ý lộ trình, giải đáp tức thì
          </T>
        </View>
        <Icon name="arrowRight" size={20} color={p.accentText} />
      </View>
    </View>
  );
}

function CtaBar() {
  const p = usePaletteB();
  const { bottomInset } = useConceptEnv();
  const { course } = DETAIL;
  const percent = discountPercent(course.priceCents, course.originalPriceCents);
  return (
    <View style={styles.ctaWrap}>
      <Glass
        intensity={60}
        tint={p.isDark ? 'dark' : 'light'}
        fill={p.isDark ? 'rgba(8,8,12,0.88)' : 'rgba(245,242,234,0.92)'}
        borderWidth={0}
        radius={0}
        contentStyle={[styles.cta, { paddingBottom: bottomInset + 8, borderTopColor: p.hairline }]}
      >
        <View>
          <T v="h1" style={styles.price}>
            {formatUsd(course.priceCents)}
          </T>
          <View style={styles.row}>
            {course.originalPriceCents ? (
              <T v="small" color="muted" style={styles.strike}>
                {formatUsd(course.originalPriceCents)}
              </T>
            ) : null}
            {percent ? (
              <T v="tiny" color="goldText">
                -{percent}%
              </T>
            ) : null}
          </View>
        </View>
        <NeonButton label="Đăng ký học" style={styles.flex} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hỏi AI về khóa học"
          style={[styles.aiBtn, { borderColor: p.accentText }]}
        >
          <Icon name="sparkles" size={22} color={p.accentText} />
        </Pressable>
      </Glass>
    </View>
  );
}

export function CourseScreenB() {
  const p = usePaletteB();
  return (
    <ScreenShell backgroundColor={p.bg} footer={<CtaBar />}>
      <FakeStatusBar color="#FFFFFF" />
      <CourseHero />
      <View style={styles.body}>
        <TeacherLine />
        <Facts />
        <Tabs />
        <Overview />
      </View>
      <View style={styles.tail} />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  flex: { flex: 1 },
  hero: { height: HERO_H, justifyContent: 'flex-end', overflow: 'hidden' },
  heroRounded: { borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  topScrim: { position: 'absolute', top: 0, left: 0, right: 0 },
  bottomScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 330 },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: PAD,
  },
  playWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 118,
    alignItems: 'center',
    gap: 8,
  },
  playRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    backgroundColor: 'rgba(8,8,12,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playCore: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 3,
    boxShadow: '0 0 28px rgba(46,242,255,0.5)',
  },
  heroText: { paddingHorizontal: PAD, paddingBottom: 24, gap: 10 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  title: { fontSize: 34, lineHeight: 39 },
  body: { paddingHorizontal: PAD, paddingTop: 20, gap: 18 },
  teacher: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, overflow: 'hidden' },
  follow: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
  },
  facts: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 14 },
  fact: { flex: 1, alignItems: 'center', gap: 2 },
  factValue: { fontSize: 22, lineHeight: 28 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  overview: { gap: 14 },
  benefits: { gap: 12 },
  benefit: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  aiRow: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiOrb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tail: { height: 130 },
  ctaWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    paddingHorizontal: PAD,
    borderTopWidth: 1,
  },
  price: { fontSize: 26, lineHeight: 30 },
  strike: { textDecorationLine: 'line-through' },
  aiBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
