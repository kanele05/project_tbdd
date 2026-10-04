import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Chunk, IconBtn, SCREEN_PAD, T, usePaletteA } from './theme';
import { useConceptEnv } from '../shared/env';
import {
  discountPercent,
  formatCount,
  formatHours,
  formatRating,
  formatUsd,
} from '../shared/format';
import { Icon } from '../shared/icons';
import { DETAIL, portraitUrl } from '../shared/mock';
import { Photo } from '../shared/Photo';
import { FakeStatusBar, ScreenShell } from '../shared/ScreenShell';

function HeroImage() {
  const p = usePaletteA();
  const { topInset } = useConceptEnv();
  const { course } = DETAIL;
  return (
    <View style={styles.hero}>
      <View style={StyleSheet.absoluteFill}>
        <Photo source={course.photo} width={900} placeholderColor={p.purpleTint} />
      </View>
      <LinearGradient
        colors={['rgba(40,20,120,0.45)', 'rgba(40,20,120,0.1)', 'rgba(40,20,120,0.75)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.heroTop, { paddingTop: topInset + 8 }]}>
        <IconBtn name="chevronLeft" label="Quay lại" />
        <View style={styles.heroActions}>
          <IconBtn name="heart" label="Yêu thích" color={p.pinkText} />
          <IconBtn name="share" label="Chia sẻ" />
        </View>
      </View>
      <View style={styles.playWrap}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Xem thử bài 1, 3 phút 20 giây"
          style={({ pressed }) => [styles.play, pressed ? styles.playPressed : null]}
        >
          <Icon name="play" size={30} color="#5A33C0" fill="#5A33C0" />
        </Pressable>
        <View style={styles.previewPill}>
          <T v="tiny" color="white">
            Xem thử bài 1 · 3:20
          </T>
        </View>
      </View>
    </View>
  );
}

function StatsRow() {
  const p = usePaletteA();
  const { course } = DETAIL;
  const stats = [
    {
      icon: 'star' as const,
      color: p.goldText,
      fill: p.gold,
      value: formatRating(course.rating),
      label: `${formatCount(course.ratingCount)} lượt`,
    },
    {
      icon: 'users' as const,
      color: p.primaryText,
      fill: undefined,
      value: formatCount(course.students),
      label: 'học viên',
    },
    {
      icon: 'clock' as const,
      color: p.purpleText,
      fill: undefined,
      value: formatHours(course.hours),
      label: `${course.lessons} bài học`,
    },
  ];
  return (
    <View style={styles.stats}>
      {stats.map((stat) => (
        <Card key={stat.label} style={styles.stat}>
          <Icon name={stat.icon} size={20} color={stat.color} fill={stat.fill} strokeWidth={2.3} />
          <T v="h3" numberOfLines={1}>
            {stat.value}
          </T>
          <T v="tiny" color="muted" numberOfLines={1}>
            {stat.label}
          </T>
        </Card>
      ))}
    </View>
  );
}

function Tabs() {
  const p = usePaletteA();
  return (
    <View style={[styles.tabs, { backgroundColor: p.track }]} accessibilityRole="tablist">
      {DETAIL.tabs.map((tab, index) => {
        const isActive = index === 0;
        return (
          <Pressable
            key={tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            style={[
              styles.tab,
              isActive ? { backgroundColor: p.purple, borderBottomColor: p.purpleLedge } : null,
            ]}
          >
            <T v="small" style={{ color: isActive ? '#FFFFFF' : p.muted }} numberOfLines={1}>
              {tab}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

function Overview() {
  const p = usePaletteA();
  return (
    <View style={styles.overview}>
      <T v="body" color="muted">
        {DETAIL.description}
      </T>
      <T v="title">Bạn sẽ học được</T>
      <View style={styles.benefits}>
        {DETAIL.benefits.map((benefit) => (
          <View key={benefit} style={styles.benefit}>
            <View style={[styles.check, { backgroundColor: p.greenTint }]}>
              <Icon name="check" size={16} color={p.greenText} strokeWidth={3.2} />
            </View>
            <View style={styles.flex}>
              <T v="body">{benefit}</T>
            </View>
          </View>
        ))}
      </View>
      <LinearGradient
        colors={['#00BDD6', '#7B4DE8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.aiBorder}
      >
        <View style={[styles.aiInner, { backgroundColor: p.card }]}>
          <View style={[styles.aiIcon, { backgroundColor: p.purple }]}>
            <Icon name="sparkles" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.flex}>
            <T v="h3">Hỏi AI Tutor về khóa học này</T>
            <T v="small" color="muted">
              Tóm tắt nội dung, gợi ý lộ trình phù hợp với bạn.
            </T>
          </View>
          <Icon name="chevronRight" size={22} color={p.purpleText} strokeWidth={2.6} />
        </View>
      </LinearGradient>
    </View>
  );
}

function CtaBar() {
  const p = usePaletteA();
  const { bottomInset } = useConceptEnv();
  const { course } = DETAIL;
  return (
    <View
      style={[
        styles.cta,
        { backgroundColor: p.tabBg, borderTopColor: p.cardBorder, paddingBottom: bottomInset + 8 },
      ]}
    >
      <View>
        <T v="title" color="primaryText">
          {formatUsd(course.priceCents)}
        </T>
        {course.originalPriceCents ? (
          <T v="small" color="muted" style={styles.strike}>
            {formatUsd(course.originalPriceCents)}
          </T>
        ) : null}
      </View>
      <Chunk label="Đăng ký học" tone="primary" style={styles.ctaMain} />
      <IconBtn name="cart" label="Thêm vào giỏ hàng" />
    </View>
  );
}

export function CourseScreenA() {
  const p = usePaletteA();
  const { course } = DETAIL;
  const percent = discountPercent(course.priceCents, course.originalPriceCents);
  return (
    <ScreenShell backgroundColor={p.bg} footer={<CtaBar />}>
      <FakeStatusBar color="#FFFFFF" />
      <HeroImage />
      <View style={[styles.sheet, { backgroundColor: p.bg }]}>
        <View style={styles.chips}>
          <View style={[styles.chip, { backgroundColor: p.purpleTint }]}>
            <T v="tiny" color="purpleText">
              {course.category}
            </T>
          </View>
          {percent ? (
            <View style={[styles.chip, { backgroundColor: p.pink }]}>
              <T v="tiny" color="white">
                -{percent}% hôm nay
              </T>
            </View>
          ) : null}
        </View>
        <T v="display">{course.title}</T>
        <View style={styles.teacherRow}>
          <View style={[styles.teacherPhoto, { borderColor: p.primary }]}>
            <Photo source={portraitUrl('men', 32)} width={120} placeholderColor={p.purpleTint} />
          </View>
          <View style={styles.flex}>
            <T v="h3">{course.teacher}</T>
            <T v="small" color="muted">
              {course.teacherJob}
            </T>
          </View>
          <View style={[styles.follow, { backgroundColor: p.primaryTint }]}>
            <T v="small" color="primaryText">
              Theo dõi
            </T>
          </View>
        </View>
        <StatsRow />
        <View style={[styles.reward, { backgroundColor: p.goldTint }]}>
          <Icon name="trophy" size={26} color={p.goldText} strokeWidth={2.2} />
          <View style={styles.flex}>
            <T v="h3" color="goldText">
              Nhận +{formatCount(course.xp)} XP
            </T>
            <T v="small" color="goldText">
              khi hoàn thành khóa học, kèm chứng chỉ.
            </T>
          </View>
        </View>
        <Tabs />
        <Overview />
        <View style={styles.tail} />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  hero: { height: 330 },
  heroTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN_PAD,
  },
  heroActions: { flexDirection: 'row', gap: 10 },
  playWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 130,
    alignItems: 'center',
    gap: 10,
  },
  play: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 6,
    borderBottomColor: '#CFC4F5',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 4,
  },
  playPressed: { transform: [{ translateY: 3 }], borderBottomWidth: 3 },
  previewPill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(30,16,90,0.78)',
  },
  sheet: {
    marginTop: -34,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingHorizontal: SCREEN_PAD,
    paddingTop: 22,
    gap: 16,
  },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  teacherRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  teacherPhoto: { width: 52, height: 52, borderRadius: 26, borderWidth: 3, overflow: 'hidden' },
  follow: { minHeight: 40, paddingHorizontal: 14, borderRadius: 14, justifyContent: 'center' },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, padding: 12, gap: 3, alignItems: 'flex-start' },
  reward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 20,
  },
  tabs: { flexDirection: 'row', padding: 4, borderRadius: 20, gap: 2 },
  tab: {
    flex: 1,
    minHeight: 44,
    borderRadius: 16,
    borderBottomWidth: 4,
    borderBottomColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overview: { gap: 14 },
  benefits: { gap: 12 },
  benefit: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBorder: { borderRadius: 24, padding: 2.5 },
  aiInner: { borderRadius: 22, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  aiIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tail: { height: 120 },
  cta: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    paddingHorizontal: SCREEN_PAD,
    borderTopWidth: 2,
  },
  ctaMain: { flex: 1 },
  strike: { textDecorationLine: 'line-through' },
});
