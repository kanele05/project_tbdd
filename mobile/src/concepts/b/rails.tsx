import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Text as SvgText } from 'react-native-svg';

import { FONT_B, GlassButton, PAD, Section, T, usePaletteB } from './theme';
import { discountPercent, formatCount, formatRating, formatUsd } from '../shared/format';
import { Icon } from '../shared/icons';
import {
  CATEGORIES,
  COURSES,
  INSPIRES,
  POPULAR,
  RECOMMENDED,
  TEACHERS,
  type MockInspire,
} from '../shared/mock';
import { Photo } from '../shared/Photo';
import type { MockCourse, MockTeacher } from '../shared/types';

const RAIL = { paddingHorizontal: PAD, gap: 14 } as const;

/** Netflix-style "continue watching": 16:9 thumbnail, neon progress line, resume meta. */
const CONTINUE_ITEMS: { course: MockCourse; progress: number; meta: string }[] = [
  { course: COURSES.reactNative, progress: 0.68, meta: 'Bài 12 · còn 8 phút' },
  { course: COURSES.python, progress: 0.31, meta: 'Bài 15 · còn 12 phút' },
  { course: COURSES.video, progress: 0.12, meta: 'Bài 5 · còn 6 phút' },
];

export function ContinueRail() {
  const p = usePaletteB();
  return (
    <Section title="Tiếp tục xem" gap={28}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={RAIL}>
        {CONTINUE_ITEMS.map(({ course, progress, meta }) => (
          <Pressable
            key={course.id}
            accessible
            accessibilityLabel={`Tiếp tục ${course.title}, ${meta}`}
            style={styles.continueCard}
          >
            <View style={[styles.continueThumb, { backgroundColor: p.surface2 }]}>
              <Photo source={course.photo} width={500} placeholderColor={p.surface2} />
              <LinearGradient
                colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.playCenter}>
                <GlassButton icon="play" label="Phát" size={44} fill />
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progress * 100}%`, backgroundColor: '#2EF2FF' },
                  ]}
                />
              </View>
            </View>
            <T v="h3" numberOfLines={1} style={styles.continueTitle}>
              {course.title}
            </T>
            <T v="small" color="muted">
              {meta}
            </T>
          </Pressable>
        ))}
      </ScrollView>
    </Section>
  );
}

export function TopicChips() {
  const p = usePaletteB();
  return (
    <View style={styles.chipsWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={RAIL}>
        {CATEGORIES.map((category, index) => {
          const isActive = index === 0;
          return (
            <Pressable
              key={category.id}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${category.name}, ${category.count} khóa học`}
              style={[
                styles.chip,
                {
                  borderColor: isActive ? p.accentText : p.hairline,
                  backgroundColor: isActive
                    ? p.isDark
                      ? 'rgba(46,242,255,0.1)'
                      : 'rgba(0,107,120,0.08)'
                    : 'transparent',
                },
              ]}
            >
              <Icon name={category.icon} size={18} color={isActive ? p.accentText : p.muted} />
              <T v="small" color={isActive ? 'accentText' : 'text'}>
                {category.name}
              </T>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function RankNumber({ rank }: { rank: number }) {
  const p = usePaletteB();
  return (
    <Svg width={84} height={196}>
      <SvgText
        x={78}
        y={178}
        textAnchor="end"
        fontFamily={FONT_B.serifBlack}
        fontSize={176}
        fill="none"
        stroke={p.rankStroke}
        strokeWidth={3}
      >
        {String(rank)}
      </SvgText>
    </Svg>
  );
}

function RankedPoster({ course, rank }: { course: MockCourse; rank: number }) {
  const p = usePaletteB();
  return (
    <Pressable
      accessible
      accessibilityLabel={`Hạng ${rank}: ${course.title}, ${course.teacher}`}
      style={styles.ranked}
    >
      <RankNumber rank={rank} />
      <View style={[styles.rankPoster, { backgroundColor: p.surface2 }]}>
        <Photo source={course.photo} width={400} placeholderColor={p.surface2} />
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.88)']}
          locations={[0.35, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.posterText}>
          <T v="small" color="white" numberOfLines={3} style={styles.posterTitle}>
            {course.title}
          </T>
          <View style={styles.row}>
            <Icon name="star" size={12} color="#E9C77B" fill="#E9C77B" strokeWidth={1.5} />
            <T v="tiny" color="white">
              {formatRating(course.rating)}
            </T>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export function TopTen() {
  return (
    <Section title="Top 10 tuần này">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.topRail}
      >
        {POPULAR.map((course, index) => (
          <RankedPoster key={course.id} course={course} rank={index + 1} />
        ))}
      </ScrollView>
    </Section>
  );
}

function PosterCard({ course }: { course: MockCourse }) {
  const p = usePaletteB();
  const percent = discountPercent(course.priceCents, course.originalPriceCents);
  return (
    <Pressable
      accessible
      accessibilityLabel={`${course.title}, ${course.teacher}, ${formatUsd(course.priceCents)}`}
      style={styles.poster}
    >
      <View style={[styles.posterImage, { backgroundColor: p.surface2 }]}>
        <Photo source={course.photo} width={400} placeholderColor={p.surface2} />
        {percent ? (
          <View style={[styles.saleTag, { backgroundColor: p.gold }]}>
            <T v="tiny" style={{ color: '#1A1203' }}>
              -{percent}%
            </T>
          </View>
        ) : null}
      </View>
      <T v="h3" numberOfLines={2} style={styles.posterName}>
        {course.title}
      </T>
      <View style={styles.row}>
        <Icon name="star" size={13} color={p.gold} fill={p.gold} strokeWidth={1.5} />
        <T v="small" color="goldText">
          {formatRating(course.rating)}
        </T>
        <T v="small" color="muted">
          ({formatCount(course.ratingCount)})
        </T>
      </View>
      <T v="h3" color="accentText">
        {formatUsd(course.priceCents)}
      </T>
    </Pressable>
  );
}

export function RecommendedRail() {
  return (
    <Section title="Dành riêng cho bạn">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={RAIL}>
        {RECOMMENDED.map((course) => (
          <PosterCard key={course.id} course={course} />
        ))}
      </ScrollView>
    </Section>
  );
}

function InspireCard({ item }: { item: MockInspire }) {
  return (
    <Pressable
      accessible
      accessibilityLabel={`${item.title}, ${item.teacher}, ${item.lessons} bài`}
      style={styles.inspire}
    >
      <View style={StyleSheet.absoluteFill}>
        <Photo source={item.photo} width={700} placeholderColor="#1C1C27" />
      </View>
      <LinearGradient
        colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.9)']}
        locations={[0.2, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.inspireTop}>
        <GlassButton icon="play" label="Phát" size={40} fill />
      </View>
      <View style={styles.inspireBody}>
        <T v="h1" color="white" numberOfLines={2} style={styles.inspireTitle}>
          {item.title}
        </T>
        <T v="small" color="whiteSoft">
          {item.teacher} · {item.lessons} bài
        </T>
      </View>
    </Pressable>
  );
}

export function InspireRail() {
  return (
    <Section title="Truyền cảm hứng">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={RAIL}>
        {INSPIRES.map((item) => (
          <InspireCard key={item.id} item={item} />
        ))}
      </ScrollView>
    </Section>
  );
}

function TeacherCard({ teacher }: { teacher: MockTeacher }) {
  const p = usePaletteB();
  return (
    <Pressable
      accessible
      accessibilityLabel={`${teacher.name}, ${teacher.field}`}
      style={[styles.teacher, { backgroundColor: p.surface2 }]}
    >
      <View style={StyleSheet.absoluteFill}>
        <Photo source={teacher.avatar} width={400} placeholderColor={p.surface2} position="top" />
      </View>
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.9)']}
        locations={[0.4, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.teacherText}>
        <T v="h3" color="white" numberOfLines={2} style={styles.teacherName}>
          {teacher.name}
        </T>
        <T v="tiny" color="whiteSoft" numberOfLines={1}>
          {teacher.field}
        </T>
        <View style={styles.row}>
          <Icon name="star" size={12} color="#E9C77B" fill="#E9C77B" strokeWidth={1.5} />
          <T v="tiny" color="white">
            {formatRating(teacher.rating)}
          </T>
        </View>
      </View>
    </Pressable>
  );
}

export function TeacherRail() {
  return (
    <Section title="Giảng viên nổi bật">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={RAIL}>
        {TEACHERS.map((teacher) => (
          <TeacherCard key={teacher.id} teacher={teacher} />
        ))}
      </ScrollView>
    </Section>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  continueCard: { width: 248, gap: 3 },
  continueThumb: { height: 140, borderRadius: 14, overflow: 'hidden', marginBottom: 8 },
  continueTitle: { marginTop: 0 },
  playCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressFill: { height: 4 },
  chipsWrap: { marginTop: 22 },
  chip: {
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topRail: { paddingHorizontal: PAD, gap: 6 },
  ranked: { flexDirection: 'row', alignItems: 'flex-end', width: 84 + 130 - 14 },
  rankPoster: {
    width: 130,
    height: 190,
    borderRadius: 12,
    overflow: 'hidden',
    marginLeft: -14,
    marginBottom: 6,
    justifyContent: 'flex-end',
  },
  posterText: { padding: 10, gap: 4 },
  posterTitle: { fontFamily: FONT_B.semi, lineHeight: 17 },
  poster: { width: 156, gap: 4 },
  posterImage: { height: 228, borderRadius: 12, overflow: 'hidden', marginBottom: 6 },
  saleTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  posterName: { minHeight: 42 },
  inspire: {
    width: 320,
    height: 214,
    borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  inspireTop: { position: 'absolute', top: 12, right: 12 },
  inspireBody: { padding: 16, gap: 4 },
  inspireTitle: { fontSize: 24, lineHeight: 30 },
  teacher: {
    width: 140,
    height: 196,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  teacherText: { padding: 12, gap: 3 },
  teacherName: { fontFamily: FONT_B.serif, fontSize: 16, lineHeight: 20 },
});
