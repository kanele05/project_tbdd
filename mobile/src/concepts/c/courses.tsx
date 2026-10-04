import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GlassCard, GlassIconButton, Pill, Rail, Section } from './parts';
import { FONT_C, PAD, T, usePaletteC } from './theme';
import { discountPercent, formatCount, formatRating, formatUsd } from '../shared/format';
import { Icon } from '../shared/icons';
import { INSPIRES, POPULAR, RECOMMENDED, type MockInspire } from '../shared/mock';
import { Photo } from '../shared/Photo';
import type { CourseBadge, MockCourse } from '../shared/types';

const BADGE_FILL: Record<CourseBadge, string> = {
  DISCOUNT: '#C2185B',
  BEST_SELLER: '#5B3DF0',
  NEW: '#0A6B61',
};

function badgeLabel(course: MockCourse): string | null {
  if (!course.badge) return null;
  if (course.badge === 'DISCOUNT') {
    const percent = discountPercent(course.priceCents, course.originalPriceCents);
    return percent ? `-${percent}%` : 'Ưu đãi';
  }
  return course.badge === 'BEST_SELLER' ? 'Bán chạy' : 'Mới';
}

function Rating({ course }: { course: MockCourse }) {
  const p = usePaletteC();
  return (
    <View style={styles.row}>
      <Icon name="star" size={13} color={p.gold} fill={p.gold} strokeWidth={1.5} />
      <T v="small" color="goldText">
        {formatRating(course.rating)}
      </T>
      <T v="small" color="muted">
        ({formatCount(course.ratingCount)})
      </T>
    </View>
  );
}

/** Photo card with a frosted info panel floating over its lower part. */
function PopularCard({ course }: { course: MockCourse }) {
  const label = badgeLabel(course);
  return (
    <View style={styles.popular}>
      <Pressable
        accessible
        accessibilityLabel={`${course.title}, ${course.teacher}, ${formatUsd(course.priceCents)}`}
        style={styles.popularClip}
      >
        <View style={StyleSheet.absoluteFill}>
          <Photo source={course.photo} width={520} placeholderColor="#2A2150" />
        </View>
        <LinearGradient
          colors={['rgba(30,20,90,0.35)', 'rgba(30,20,90,0)']}
          style={styles.topShade}
        />
        <View style={styles.panelWrap}>
          <GlassCard isStrong radius={22} contentStyle={styles.panel}>
            <T v="h3" numberOfLines={2} style={styles.panelTitle}>
              {course.title}
            </T>
            <T v="small" color="muted" numberOfLines={1}>
              {course.teacher}
            </T>
            <View style={styles.between}>
              <Rating course={course} />
              <T v="h3" color="violetText">
                {formatUsd(course.priceCents)}
              </T>
            </View>
          </GlassCard>
        </View>
      </Pressable>
      {label && course.badge ? (
        <View style={[styles.badge, { backgroundColor: BADGE_FILL[course.badge] }]}>
          <Text style={styles.badgeText}>{label}</Text>
        </View>
      ) : null}
      <GlassIconButton
        icon="bookmark"
        label={`Lưu khóa học ${course.title}`}
        size={48}
        style={styles.bookmark}
      />
    </View>
  );
}

export function PopularRail() {
  return (
    <Section title="Khóa học phổ biến">
      <Rail>
        {POPULAR.map((course) => (
          <PopularCard key={course.id} course={course} />
        ))}
      </Rail>
    </Section>
  );
}

const MATCH = [96, 92, 88];

function RecommendedRow({ course, match }: { course: MockCourse; match: number }) {
  const p = usePaletteC();
  return (
    <GlassCard radius={26} contentStyle={styles.rowCard}>
      <Pressable
        accessible
        accessibilityLabel={`${course.title}, ${course.teacher}, phù hợp ${match}%`}
        style={styles.rowMain}
      >
        <View style={[styles.rowThumb, { backgroundColor: p.chip }]}>
          <Photo source={course.photo} width={260} placeholderColor={p.chip} />
        </View>
        <View style={styles.rowText}>
          <Pill label={`${match}% phù hợp`} hue="teal" icon="sparkles" />
          <T v="h3" numberOfLines={2}>
            {course.title}
          </T>
          <T v="small" color="muted" numberOfLines={1}>
            {course.teacher}
          </T>
          <View style={styles.between}>
            <Rating course={course} />
            <T v="h3" color="violetText">
              {formatUsd(course.priceCents)}
            </T>
          </View>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Lưu khóa học ${course.title}`}
        style={styles.rowSave}
      >
        <Icon name="bookmark" size={22} color={p.muted} />
      </Pressable>
    </GlassCard>
  );
}

export function RecommendedList() {
  return (
    <Section title="Gợi ý cho bạn">
      <View style={styles.list}>
        {RECOMMENDED.map((course, index) => (
          <RecommendedRow key={course.id} course={course} match={MATCH[index] ?? 85} />
        ))}
      </View>
    </Section>
  );
}

function InspireCard({ item }: { item: MockInspire }) {
  return (
    <View style={styles.inspire}>
      <Pressable
        accessible
        accessibilityLabel={`${item.title}, ${item.teacher}, ${item.lessons} bài`}
        style={styles.inspireClip}
      >
        <View style={StyleSheet.absoluteFill}>
          <Photo source={item.photo} width={700} placeholderColor="#2A2150" />
        </View>
        <View style={styles.panelWrap}>
          <GlassCard isStrong radius={22} contentStyle={styles.panel}>
            <T v="h3" numberOfLines={2}>
              {item.title}
            </T>
            <T v="small" color="muted" numberOfLines={1}>
              {item.teacher} · {item.lessons} bài
            </T>
          </GlassCard>
        </View>
      </Pressable>
      <GlassIconButton
        icon="play"
        label={`Phát ${item.title}`}
        isFilled
        size={48}
        style={styles.bookmark}
      />
    </View>
  );
}

export function InspireRail() {
  return (
    <Section title="Truyền cảm hứng">
      <Rail>
        {INSPIRES.map((item) => (
          <InspireCard key={item.id} item={item} />
        ))}
      </Rail>
    </Section>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  popular: { width: 236, height: 300 },
  popularClip: {
    flex: 1,
    borderRadius: 30,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    boxShadow: '0 12px 30px rgba(60,40,160,0.28)',
  },
  topShade: { position: 'absolute', top: 0, left: 0, right: 0, height: 90 },
  panelWrap: { padding: 8 },
  panel: { padding: 14, gap: 3 },
  panelTitle: { minHeight: 42 },
  badge: {
    position: 'absolute',
    top: 14,
    left: 14,
    minHeight: 28,
    paddingHorizontal: 12,
    borderRadius: 14,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  badgeText: { fontFamily: FONT_C.bold, fontSize: 12, lineHeight: 16, color: '#FFFFFF' },
  bookmark: { position: 'absolute', top: 8, right: 8 },
  list: { paddingHorizontal: PAD, gap: 12 },
  rowCard: { padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  rowMain: { flex: 1, flexDirection: 'row', gap: 12 },
  rowThumb: { width: 92, height: 120, borderRadius: 20, overflow: 'hidden' },
  rowText: { flex: 1, gap: 4, justifyContent: 'center' },
  rowSave: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  inspire: { width: 300, height: 210 },
  inspireClip: {
    flex: 1,
    borderRadius: 30,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    boxShadow: '0 12px 30px rgba(60,40,160,0.28)',
  },
});
