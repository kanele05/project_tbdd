import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Card, SCREEN_PAD, Section, T, usePaletteA, type PaletteA } from './theme';
import { discountPercent, formatCount, formatRating, formatUsd } from '../shared/format';
import { Icon } from '../shared/icons';
import {
  CATEGORIES,
  INSPIRES,
  POPULAR,
  RECOMMENDED,
  TEACHERS,
  type MockInspire,
} from '../shared/mock';
import { Photo } from '../shared/Photo';
import type { CourseBadge, MockCategory, MockCourse, MockTeacher } from '../shared/types';

function categoryAccent(p: PaletteA, id: string): { bg: string; fg: string } {
  switch (id) {
    case 'code':
      return { bg: p.purpleTint, fg: p.purpleText };
    case 'design':
      return { bg: p.pinkTint, fg: p.pinkText };
    case 'business':
      return { bg: p.primaryTint, fg: p.primaryText };
    case 'writing':
      return { bg: p.orangeTint, fg: p.orangeText };
    case 'movie':
      return { bg: p.blueTint, fg: p.blueText };
    default:
      return { bg: p.greenTint, fg: p.greenText };
  }
}

function CategoryTile({ category, width }: { category: MockCategory; width: number }) {
  const p = usePaletteA();
  const accent = categoryAccent(p, category.id);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${category.name}, ${category.count} khóa học`}
      style={({ pressed }) => [pressed ? styles.pressed : null, { width }]}
    >
      <Card style={styles.catTile}>
        <View style={[styles.catIcon, { backgroundColor: accent.bg }]}>
          <Icon name={category.icon} size={26} color={accent.fg} strokeWidth={2.3} />
        </View>
        <T v="small" align="center" numberOfLines={1} style={styles.catName}>
          {category.name}
        </T>
        <T v="tiny" color="muted" align="center">
          {category.count} khóa
        </T>
      </Card>
    </Pressable>
  );
}

export function Categories() {
  // 3 columns inside the 20 dp screen padding, 10 dp gaps.
  const width = (350 - 20) / 3;
  return (
    <Section title="Khám phá chủ đề" action="Tất cả">
      <View style={styles.catGrid}>
        {CATEGORIES.map((category) => (
          <CategoryTile key={category.id} category={category} width={width} />
        ))}
      </View>
    </Section>
  );
}

function BadgeA({ badge, percent }: { badge: CourseBadge; percent: number | null }) {
  const p = usePaletteA();
  const spec: Record<CourseBadge, { bg: string; fg: string; label: string }> = {
    BEST_SELLER: { bg: p.gold, fg: p.onGold, label: 'Bán chạy' },
    DISCOUNT: { bg: p.pink, fg: '#FFFFFF', label: percent ? `-${percent}%` : 'Giảm giá' },
    NEW: { bg: p.green, fg: '#06301B', label: 'Mới' },
  };
  const s = spec[badge];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <T v="tiny" style={{ color: s.fg }}>
        {s.label}
      </T>
    </View>
  );
}

function BookmarkChip() {
  const p = usePaletteA();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Lưu khóa học"
      hitSlop={4}
      style={[styles.bookmark, { backgroundColor: p.card }]}
    >
      <Icon name="bookmark" size={20} color={p.purpleText} strokeWidth={2.4} />
    </Pressable>
  );
}

function PopularCard({ course }: { course: MockCourse }) {
  const p = usePaletteA();
  const percent = discountPercent(course.priceCents, course.originalPriceCents);
  return (
    <Pressable
      accessible
      accessibilityLabel={`${course.title}, ${course.teacher}, ${formatUsd(course.priceCents)}`}
      style={({ pressed }) => (pressed ? styles.pressed : null)}
    >
      <Card style={styles.popCard}>
        <View style={styles.popImage}>
          <Photo source={course.photo} width={500} placeholderColor={p.purpleTint} />
          {course.badge ? (
            <View style={styles.badgeSlot}>
              <BadgeA badge={course.badge} percent={percent} />
            </View>
          ) : null}
          <View style={styles.bookmarkSlot}>
            <BookmarkChip />
          </View>
        </View>
        <View style={styles.popBody}>
          <T v="h3" numberOfLines={2} style={styles.popTitle}>
            {course.title}
          </T>
          <T v="small" color="muted" numberOfLines={1}>
            {course.teacher}
          </T>
          <View style={styles.ratingRow}>
            <Icon name="star" size={15} color="#F2A900" fill="#FFC53D" strokeWidth={1.5} />
            <T v="small">{formatRating(course.rating)}</T>
            <T v="small" color="muted">
              ({formatCount(course.ratingCount)})
            </T>
            <View style={[styles.xpChip, { backgroundColor: p.goldTint }]}>
              <Icon name="zap" size={12} color={p.goldText} fill={p.goldText} strokeWidth={1.5} />
              <T v="tiny" color="goldText">
                +{formatCount(course.xp)} XP
              </T>
            </View>
          </View>
          <View style={styles.priceRow}>
            <T v="title" color="primaryText">
              {formatUsd(course.priceCents)}
            </T>
            {course.originalPriceCents ? (
              <T v="small" color="muted" style={styles.strike}>
                {formatUsd(course.originalPriceCents)}
              </T>
            ) : null}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

export function PopularRail() {
  return (
    <Section title="Phổ biến tuần này">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
      >
        {POPULAR.map((course) => (
          <PopularCard key={course.id} course={course} />
        ))}
      </ScrollView>
    </Section>
  );
}

function RecommendedRow({ course }: { course: MockCourse }) {
  const p = usePaletteA();
  return (
    <Pressable
      accessible
      accessibilityLabel={`${course.title}, ${course.teacher}`}
      style={({ pressed }) => (pressed ? styles.pressed : null)}
    >
      <Card style={styles.recRow}>
        <View style={styles.recThumb}>
          <Photo source={course.photo} width={300} placeholderColor={p.purpleTint} />
        </View>
        <View style={styles.recInfo}>
          <T v="h3" numberOfLines={2}>
            {course.title}
          </T>
          <T v="small" color="muted" numberOfLines={1}>
            {course.teacher}
          </T>
          <View style={styles.ratingRow}>
            <Icon name="star" size={14} color="#F2A900" fill="#FFC53D" strokeWidth={1.5} />
            <T v="small">{formatRating(course.rating)}</T>
            <T v="small" color="muted">
              · {course.lessons} bài
            </T>
          </View>
          <T v="h3" color="primaryText">
            {formatUsd(course.priceCents)}
          </T>
        </View>
        <BookmarkChipPlain />
      </Card>
    </Pressable>
  );
}

function BookmarkChipPlain() {
  const p = usePaletteA();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Lưu khóa học"
      hitSlop={6}
      style={[styles.recBookmark, { backgroundColor: p.purpleTint }]}
    >
      <Icon name="bookmark" size={20} color={p.purpleText} strokeWidth={2.4} />
    </Pressable>
  );
}

export function RecommendedList() {
  return (
    <Section title="Dành riêng cho bạn">
      <View style={styles.recList}>
        {RECOMMENDED.map((course) => (
          <RecommendedRow key={course.id} course={course} />
        ))}
      </View>
    </Section>
  );
}

function InspireCard({ item }: { item: MockInspire }) {
  const p = usePaletteA();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${item.teacher}`}
      style={({ pressed }) => [
        styles.inspire,
        { borderBottomColor: p.purpleLedge },
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={StyleSheet.absoluteFill}>
        <Photo source={item.photo} width={500} placeholderColor="#2E2470" />
      </View>
      <LinearGradient
        colors={['rgba(30,16,90,0)', 'rgba(30,16,90,0.92)']}
        locations={[0.25, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.inspireChip}>
        <Icon name="video" size={14} color="#FFFFFF" strokeWidth={2.4} />
        <T v="tiny" color="white">
          {item.lessons} bài
        </T>
      </View>
      <View style={styles.inspireBody}>
        <T v="h3" color="white" numberOfLines={3}>
          {item.title}
        </T>
        <T v="small" color="whiteSoft" numberOfLines={1}>
          {item.teacher}
        </T>
      </View>
    </Pressable>
  );
}

export function InspireRail() {
  return (
    <Section title="Truyền cảm hứng">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
      >
        {INSPIRES.map((item) => (
          <InspireCard key={item.id} item={item} />
        ))}
      </ScrollView>
    </Section>
  );
}

function TeacherItem({ teacher }: { teacher: MockTeacher }) {
  const p = usePaletteA();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${teacher.name}, ${teacher.field}`}
      style={({ pressed }) => [styles.teacher, pressed ? styles.pressed : null]}
    >
      <LinearGradient
        colors={['#00BDD6', '#7B4DE8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.teacherRing}
      >
        <View style={[styles.teacherPhoto, { borderColor: p.bg }]}>
          <Photo source={teacher.avatar} width={200} placeholderColor={p.purpleTint} />
        </View>
      </LinearGradient>
      <T v="small" align="center" numberOfLines={2} style={styles.teacherName}>
        {teacher.name}
      </T>
      <T v="tiny" color="muted" align="center" numberOfLines={1}>
        {teacher.field}
      </T>
      <View style={[styles.ratingPill, { backgroundColor: p.goldTint }]}>
        <Icon name="star" size={12} color={p.goldText} fill={p.goldText} strokeWidth={1.5} />
        <T v="tiny" color="goldText">
          {formatRating(teacher.rating)}
        </T>
      </View>
    </Pressable>
  );
}

export function TeacherRail() {
  return (
    <Section title="Giảng viên nổi bật">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
      >
        {TEACHERS.map((teacher) => (
          <TeacherItem key={teacher.id} teacher={teacher} />
        ))}
      </ScrollView>
    </Section>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  rail: { paddingHorizontal: SCREEN_PAD, gap: 14, paddingBottom: 6 },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: SCREEN_PAD,
  },
  catTile: { alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6, gap: 2 },
  catIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  catName: { alignSelf: 'stretch' },
  popCard: { width: 256, padding: 8 },
  popImage: { height: 148, borderRadius: 18, overflow: 'hidden' },
  badgeSlot: { position: 'absolute', top: 10, left: 10 },
  bookmarkSlot: { position: 'absolute', top: 8, right: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  bookmark: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popBody: { paddingHorizontal: 6, paddingTop: 10, paddingBottom: 6, gap: 3 },
  popTitle: { minHeight: 42 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  xpChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 },
  strike: { textDecorationLine: 'line-through' },
  recList: { paddingHorizontal: SCREEN_PAD, gap: 12 },
  recRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 },
  recThumb: { width: 92, height: 108, borderRadius: 16, overflow: 'hidden' },
  recInfo: { flex: 1, gap: 2 },
  recBookmark: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  inspire: {
    width: 176,
    height: 236,
    borderRadius: 24,
    borderBottomWidth: 5,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  inspireChip: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(30,16,90,0.7)',
  },
  inspireBody: { padding: 14, gap: 4 },
  teacher: { width: 108, alignItems: 'center', gap: 2 },
  teacherRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  teacherPhoto: { width: 82, height: 82, borderRadius: 41, borderWidth: 3, overflow: 'hidden' },
  teacherName: { minHeight: 36 },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
});
