import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GlassCard, GlassIconButton, Pill } from './parts';
import { FONT_C, PAD, T, usePaletteC } from './theme';
import { useConceptEnv } from '../shared/env';
import { discountPercent, formatCount, formatHours, formatRating } from '../shared/format';
import { Glass } from '../shared/Glass';
import { Icon, type IconName } from '../shared/icons';
import { DETAIL, PHOTO, portraitUrl } from '../shared/mock';
import { Photo } from '../shared/Photo';

export function CourseNav() {
  const p = usePaletteC();
  const { topInset } = useConceptEnv();
  return (
    <View style={[styles.nav, { paddingTop: topInset + 8 }]}>
      <GlassIconButton icon="chevronLeft" label="Quay lại" />
      <View style={styles.row}>
        <GlassIconButton icon="share" label="Chia sẻ" />
        <GlassIconButton icon="heart" label="Yêu thích" color={p.pinkText} />
      </View>
    </View>
  );
}

/** Rounded hero photo with a frosted play button and a "watch the intro" pill. */
export function CourseHero() {
  return (
    <View style={styles.hero}>
      <View style={StyleSheet.absoluteFill}>
        <Photo source={PHOTO.codeJs} width={900} placeholderColor="#2A2150" />
      </View>
      <LinearGradient
        colors={['rgba(91,61,240,0.32)', 'rgba(40,24,120,0.62)']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.playWrap}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Xem giới thiệu khóa học, 3 phút 20 giây"
        >
          <Glass
            intensity={30}
            tint="dark"
            fill="rgba(24,14,84,0.42)"
            borderColor="rgba(255,255,255,0.55)"
            radius={42}
            contentStyle={styles.play}
          >
            <Icon name="play" size={32} color="#FFFFFF" fill="#FFFFFF" />
          </Glass>
        </Pressable>
        <Glass
          intensity={30}
          tint="dark"
          fill="rgba(24,14,84,0.62)"
          borderColor="rgba(255,255,255,0.4)"
          radius={18}
          contentStyle={styles.previewPill}
        >
          <Text style={styles.previewText}>Xem giới thiệu · 3:20</Text>
        </Glass>
      </View>
    </View>
  );
}

type Stat = { icon: IconName; value: string; label: string };

/** Frosted card overlapping the hero: badges, title, teacher and the three key figures. */
export function CourseInfo() {
  const p = usePaletteC();
  const { course } = DETAIL;
  const percent = discountPercent(course.priceCents, course.originalPriceCents);
  const stats: Stat[] = [
    {
      icon: 'star',
      value: formatRating(course.rating),
      label: `${formatCount(course.ratingCount)} lượt`,
    },
    { icon: 'users', value: formatCount(course.students), label: 'học viên' },
    { icon: 'clock', value: formatHours(course.hours), label: `${course.lessons} bài học` },
  ];
  return (
    <GlassCard radius={32} style={styles.info} contentStyle={styles.infoBody}>
      <View style={styles.pills}>
        <Pill label={course.category} hue="violet" />
        {percent ? <Pill label={`-${percent}% hôm nay`} hue="pink" icon="clock" /> : null}
      </View>
      <T v="h1">{course.title}</T>
      <View style={styles.teacher}>
        <LinearGradient
          colors={[p.glowTeal, p.glowViolet]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatarRing}
        >
          <View style={[styles.avatar, { borderColor: p.bgSolid }]}>
            <Photo source={portraitUrl('men', 32)} width={120} placeholderColor={p.chip} />
          </View>
        </LinearGradient>
        <View style={styles.flex}>
          <T v="h3">{course.teacher}</T>
          <T v="small" color="muted">
            {course.teacherJob}
          </T>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Theo dõi ${course.teacher}`}
          style={[styles.follow, { backgroundColor: p.chip, borderColor: p.hairline }]}
        >
          <T v="small" color="violetText">
            Theo dõi
          </T>
        </Pressable>
      </View>
      <View style={[styles.stats, { borderTopColor: p.hairline }]}>
        {stats.map((stat, index) => (
          <View
            key={stat.label}
            style={[
              styles.stat,
              index > 0 ? { borderLeftColor: p.hairline, borderLeftWidth: 1 } : null,
            ]}
          >
            <View style={styles.row}>
              <Icon
                name={stat.icon}
                size={16}
                color={stat.icon === 'star' ? p.gold : p.violetText}
                fill={stat.icon === 'star' ? p.gold : undefined}
                strokeWidth={2.2}
              />
              <T v="h3" numberOfLines={1}>
                {stat.value}
              </T>
            </View>
            <T v="tiny" color="muted" numberOfLines={1}>
              {stat.label}
            </T>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nav: {
    paddingHorizontal: PAD,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hero: {
    height: 268,
    marginHorizontal: PAD,
    marginTop: 14,
    borderRadius: 34,
    overflow: 'hidden',
    boxShadow: '0 14px 34px rgba(60,40,160,0.34)',
  },
  playWrap: { position: 'absolute', top: 36, left: 0, right: 0, alignItems: 'center', gap: 12 },
  play: { width: 84, height: 84, alignItems: 'center', justifyContent: 'center', paddingLeft: 4 },
  previewPill: { minHeight: 36, paddingHorizontal: 16, justifyContent: 'center' },
  previewText: { fontFamily: FONT_C.bold, fontSize: 13, lineHeight: 18, color: '#FFFFFF' },
  info: { marginHorizontal: PAD, marginTop: -44 },
  infoBody: { padding: 18, gap: 14 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  teacher: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarRing: { width: 54, height: 54, borderRadius: 27, padding: 2.5 },
  avatar: { flex: 1, borderRadius: 25, borderWidth: 2, overflow: 'hidden' },
  follow: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
  },
  stats: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 14 },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
});
