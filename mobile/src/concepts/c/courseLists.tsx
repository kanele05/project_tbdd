import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { LESSON_MORE, LESSON_ROWS, RATING_BARS, REVIEWS, type LessonRow } from './data';
import { GlassCard, GradOrb, Pill } from './parts';
import { PAD, T, usePaletteC } from './theme';
import { formatCount, formatHours, formatRating } from '../shared/format';
import { Icon } from '../shared/icons';
import { DETAIL } from '../shared/mock';
import { Photo } from '../shared/Photo';

function LessonItem({ lesson }: { lesson: LessonRow }) {
  const p = usePaletteC();
  const isLocked = lesson.state === 'locked';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Bài ${lesson.n}: ${lesson.title}, ${lesson.time}${
        isLocked ? ', cần đăng ký để xem' : ''
      }`}
      style={[styles.lesson, { borderBottomColor: p.hairline }]}
    >
      {isLocked ? (
        <View style={[styles.lockOrb, { backgroundColor: p.chip }]}>
          <Icon name="lock" size={18} color={p.muted} strokeWidth={2.3} />
        </View>
      ) : (
        <GradOrb icon="play" hue="violet" size={40} iconFill="#FFFFFF" />
      )}
      <View style={styles.flex}>
        <T v="h3" numberOfLines={2}>
          {lesson.n}. {lesson.title}
        </T>
        <View style={styles.row}>
          <T v="small" color="muted">
            {lesson.time}
          </T>
          {lesson.state === 'preview' ? <Pill label="Xem thử" hue="teal" /> : null}
        </View>
      </View>
    </Pressable>
  );
}

export function Lessons() {
  const p = usePaletteC();
  const { course } = DETAIL;
  return (
    <View style={styles.block}>
      <View>
        <T v="h2">Nội dung khóa học</T>
        <T v="small" color="muted">
          {course.lessons} bài học · {formatHours(course.hours)}
        </T>
      </View>
      <GlassCard radius={26} contentStyle={styles.lessonList}>
        {LESSON_ROWS.map((lesson) => (
          <LessonItem key={lesson.n} lesson={lesson} />
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Xem thêm ${LESSON_MORE} bài học`}
          style={styles.more}
        >
          <T v="small" color="violetText">
            Xem thêm {LESSON_MORE} bài học
          </T>
          <Icon name="chevronRight" size={16} color={p.violetText} strokeWidth={2.4} />
        </Pressable>
      </GlassCard>
    </View>
  );
}

function Stars({ count }: { count: number }) {
  const p = usePaletteC();
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon
          key={i}
          name="star"
          size={14}
          color={p.gold}
          fill={i <= count ? p.gold : undefined}
          strokeWidth={1.6}
        />
      ))}
    </View>
  );
}

function RatingSummary() {
  const p = usePaletteC();
  const { course } = DETAIL;
  return (
    <GlassCard radius={26} contentStyle={styles.summary}>
      <View style={styles.big}>
        <T v="display">{formatRating(course.rating)}</T>
        <Stars count={5} />
        <T v="tiny" color="muted">
          {formatCount(course.ratingCount)} đánh giá
        </T>
      </View>
      <View style={styles.bars}>
        {RATING_BARS.map((bar) => (
          <View key={bar.stars} style={styles.barRow}>
            <T v="tiny" color="muted" style={styles.barLabel}>
              {bar.stars}
            </T>
            <View style={[styles.track, { backgroundColor: p.track }]}>
              <LinearGradient
                colors={[p.glowTeal, p.glowViolet]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.fill, { width: `${Math.max(bar.share * 100, 3)}%` }]}
              />
            </View>
            <T v="tiny" color="muted" style={styles.barPct}>
              {Math.round(bar.share * 100)}%
            </T>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

export function Reviews() {
  const p = usePaletteC();
  return (
    <View style={styles.block}>
      <T v="h2">Đánh giá của học viên</T>
      <RatingSummary />
      {REVIEWS.map((review) => (
        <GlassCard key={review.id} radius={26} contentStyle={styles.review}>
          <View style={styles.reviewHead}>
            <View style={[styles.avatar, { backgroundColor: p.chip }]}>
              <Photo source={review.avatar} width={100} placeholderColor={p.chip} position="top" />
            </View>
            <View style={styles.flex}>
              <T v="h3">{review.name}</T>
              <View style={styles.row}>
                <Stars count={review.stars} />
                <T v="tiny" color="muted">
                  {review.when}
                </T>
              </View>
            </View>
          </View>
          <T v="small" style={styles.reviewText}>
            {review.text}
          </T>
        </GlassCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  starRow: { flexDirection: 'row', gap: 2 },
  block: { paddingHorizontal: PAD, marginTop: 30, gap: 14 },
  lessonList: { paddingHorizontal: 14 },
  lesson: {
    minHeight: 68,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lockOrb: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  more: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  summary: { padding: 18, flexDirection: 'row', alignItems: 'center', gap: 18 },
  big: { alignItems: 'center', gap: 4, minWidth: 96 },
  bars: { flex: 1, gap: 6 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { width: 10, textAlign: 'center' },
  barPct: { width: 34, textAlign: 'right' },
  track: { flex: 1, height: 7, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 7, borderRadius: 4 },
  review: { padding: 16, gap: 10 },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' },
  reviewText: { lineHeight: 20 },
});
