import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Flame } from './Flame';
import { Card, Chunk, IconBtn, SCREEN_PAD, T, usePaletteA } from './theme';
import { useConceptEnv } from '../shared/env';
import { formatCount } from '../shared/format';
import { Icon } from '../shared/icons';
import { AI, BANNER, CONTINUE, USER } from '../shared/mock';
import { Photo } from '../shared/Photo';
import { Ring } from '../shared/Ring';

const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const;

export function HomeHeader() {
  const p = usePaletteA();
  const { topInset } = useConceptEnv();
  return (
    <View style={[styles.header, { paddingTop: topInset + 10 }]}>
      <View style={styles.avatarWrap}>
        <LinearGradient
          colors={['#00BDD6', '#7B4DE8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatarRing}
        >
          <View style={[styles.avatarInner, { borderColor: p.bg }]}>
            <Photo source={USER.avatar} width={160} placeholderColor={p.purpleTint} />
          </View>
        </LinearGradient>
        <View style={[styles.levelBadge, { backgroundColor: p.gold, borderColor: p.bg }]}>
          <T v="tiny" color="onGold">
            {USER.level}
          </T>
        </View>
      </View>
      <View style={styles.headerText}>
        <T v="title" numberOfLines={1}>
          Chào {USER.name}!
        </T>
        <T v="small" color="muted" numberOfLines={1}>
          Hôm nay học gì nào?
        </T>
      </View>
      <View style={[styles.streakPill, { backgroundColor: p.orangeTint }]}>
        <Flame size={24} idSuffix="hdr" />
        <T v="h3" color="orangeText">
          {USER.streak}
        </T>
      </View>
      <IconBtn name="bell" label="Thông báo, 3 chưa đọc" badge />
    </View>
  );
}

/** "Tiếp tục học": the single most prominent block, gradient card with a progress ring. */
export function ContinueCard() {
  const p = usePaletteA();
  const percent = Math.round(CONTINUE.progress * 100);
  return (
    <View style={styles.pad}>
      <LinearGradient
        colors={['#8A5CF0', '#5B3BD8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { borderBottomColor: p.purpleLedge }]}
      >
        <Svg width="100%" height="100%" style={styles.svgLayer}>
          <Defs>
            <RadialGradient id="heroGlow" cx="86%" cy="92%" rx="62%" ry="78%">
              <Stop offset="0" stopColor="#00D8F0" stopOpacity="0.75" />
              <Stop offset="1" stopColor="#00D8F0" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#heroGlow)" />
          <Circle cx="12%" cy="8%" r="3" fill="#FFFFFF" opacity="0.5" />
          <Circle cx="64%" cy="14%" r="2" fill="#FFFFFF" opacity="0.55" />
          <Circle cx="92%" cy="9%" r="4" fill="#FFFFFF" opacity="0.35" />
        </Svg>
        <View style={styles.heroBody}>
          <View style={styles.heroText}>
            <View style={styles.heroChip}>
              <T v="tiny" color="white">
                Bài {CONTINUE.lessonNumber}/{CONTINUE.course.lessons}
              </T>
            </View>
            <T v="title" color="white" numberOfLines={3}>
              {CONTINUE.course.title}
            </T>
            <T v="small" color="whiteSoft" numberOfLines={2}>
              {CONTINUE.lessonTitle} · còn {CONTINUE.minutesLeft} phút
            </T>
          </View>
          <View style={styles.ringCol}>
            <Ring
              size={96}
              strokeWidth={9}
              progress={CONTINUE.progress}
              trackColor="rgba(255,255,255,0.28)"
              colors={['#FFFFFF']}
            >
              <View style={styles.ringPhoto}>
                <Photo source={CONTINUE.course.photo} width={200} placeholderColor="#4A2DB0" />
              </View>
            </Ring>
            <View style={[styles.percentPill, { backgroundColor: p.gold }]}>
              <T v="tiny" color="onGold">
                {percent}%
              </T>
            </View>
          </View>
        </View>
        <Chunk label="Học tiếp" tone="white" icon="play" iconFill style={styles.heroButton} />
      </LinearGradient>
    </View>
  );
}

/** Streak, week strip and level progress in a single card. */
export function StreakCard() {
  const p = usePaletteA();
  const xpLeft = USER.xpNext - USER.xp;
  return (
    <View style={styles.pad}>
      <Card style={styles.streakCard}>
        <View style={styles.streakTop}>
          <Flame size={52} idSuffix="card" />
          <View style={styles.flex}>
            <T v="title">{USER.streak} ngày liên tiếp</T>
            <T v="small" color="muted">
              Kỷ lục {USER.bestStreak} ngày. Học hôm nay để nối chuỗi!
            </T>
          </View>
        </View>
        <View style={styles.weekRow}>
          {DAYS.map((day, index) => {
            const isDone = USER.week[index] === true;
            const isToday = index === USER.todayIndex;
            return (
              <View
                key={day}
                style={styles.dayCol}
                accessible
                accessibilityLabel={`${day}${isDone ? ', đã học' : isToday ? ', hôm nay' : ''}`}
              >
                <T v="tiny" color={isToday ? 'orangeText' : 'muted'}>
                  {day}
                </T>
                <View
                  style={[
                    styles.dayDot,
                    isDone
                      ? { backgroundColor: p.gold }
                      : isToday
                        ? { borderColor: p.orange, borderWidth: 2.5, backgroundColor: p.orangeTint }
                        : { backgroundColor: p.track },
                  ]}
                >
                  {isDone ? (
                    <Icon name="check" size={18} color={p.onGold} strokeWidth={3.2} />
                  ) : null}
                  {isToday ? (
                    <Icon name="flame" size={18} color={p.orangeText} strokeWidth={2.4} />
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
        <View style={styles.xpRow}>
          <View style={[styles.xpBadge, { backgroundColor: p.goldTint }]}>
            <Icon name="zap" size={14} color={p.goldText} fill={p.goldText} strokeWidth={1.5} />
            <T v="tiny" color="goldText">
              Cấp {USER.level}
            </T>
          </View>
          <T v="small" color="muted">
            {formatCount(USER.xp)}/{formatCount(USER.xpNext)} XP
          </T>
        </View>
        <View style={[styles.xpTrack, { backgroundColor: p.track }]}>
          <LinearGradient
            colors={['#FFC53D', '#FF9F1C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.xpFill, { width: `${(USER.xp / USER.xpNext) * 100}%` }]}
          />
        </View>
        <T v="small" color="muted">
          Còn {xpLeft} XP nữa để lên Cấp {USER.level + 1}
        </T>
      </Card>
    </View>
  );
}

/** Slot for the upcoming AI features: personalised suggestion + entry point to the AI tutor. */
export function AiCard() {
  const p = usePaletteA();
  return (
    <View style={styles.pad}>
      <LinearGradient
        colors={['#00BDD6', '#7B4DE8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.aiBorder}
      >
        <View style={[styles.aiInner, { backgroundColor: p.card }]}>
          <View style={styles.aiHead}>
            <View style={[styles.aiIcon, { backgroundColor: p.purple }]}>
              <Icon name="sparkles" size={24} color="#FFFFFF" strokeWidth={2.2} />
            </View>
            <View style={styles.flex}>
              <T v="h3">{AI.title}</T>
              <View style={[styles.betaPill, { backgroundColor: p.primaryTint }]}>
                <T v="tiny" color="primaryText">
                  Mới · Beta
                </T>
              </View>
            </View>
          </View>
          <T v="body" color="muted">
            {AI.body}
          </T>
          <View style={styles.chipRow}>
            {AI.prompts.map((prompt) => (
              <View
                key={prompt}
                accessible
                accessibilityRole="button"
                accessibilityLabel={prompt}
                style={[styles.promptChip, { backgroundColor: p.purpleTint }]}
              >
                <T v="small" color="purpleText">
                  {prompt}
                </T>
              </View>
            ))}
          </View>
          <Chunk label={AI.cta} icon="sparkles" tone="primary" />
        </View>
      </LinearGradient>
    </View>
  );
}

/** Promo banner: deep cyan gradient, tilted sticker photo and a "-40%" badge. */
export function PromoBanner() {
  const p = usePaletteA();
  return (
    <View style={styles.pad}>
      <LinearGradient
        colors={['#0A5F73', '#0E7490']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.promo, { borderBottomColor: '#07495A' }]}
      >
        <View style={styles.promoText}>
          <View style={styles.promoTimer}>
            <Icon name="clock" size={14} color="#FFFFFF" strokeWidth={2.6} />
            <T v="tiny" color="white">
              Còn 2 ngày
            </T>
          </View>
          <T v="title" color="white">
            {BANNER.title}
          </T>
          <T v="small" color="whiteSoft">
            {BANNER.caption}
          </T>
          <Chunk label={BANNER.cta} tone="gold" compact style={styles.promoCta} />
        </View>
        <View style={styles.promoPhotoWrap}>
          <View style={[styles.promoPhoto, { borderColor: '#FFFFFF' }]}>
            <Photo source={BANNER.photo} width={300} placeholderColor="#07495A" />
          </View>
          <View style={[styles.sticker, { backgroundColor: p.gold, borderColor: '#FFFFFF' }]}>
            <T v="h3" color="onGold">
              -40%
            </T>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  svgLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' },
  pad: { paddingHorizontal: SCREEN_PAD, marginTop: 20 },
  flex: { flex: 1, gap: 2 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: SCREEN_PAD,
    paddingBottom: 4,
  },
  avatarWrap: { width: 56, height: 56 },
  avatarRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, overflow: 'hidden' },
  levelBadge: {
    position: 'absolute',
    right: -4,
    bottom: -2,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  hero: { borderRadius: 28, padding: 18, borderBottomWidth: 6, overflow: 'hidden', gap: 16 },
  heroBody: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroText: { flex: 1, gap: 8 },
  heroChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  ringCol: { alignItems: 'center' },
  ringPhoto: { width: 68, height: 68, borderRadius: 34, overflow: 'hidden' },
  percentPill: {
    marginTop: -12,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  heroButton: { alignSelf: 'stretch' },
  streakCard: { padding: 16, gap: 12 },
  streakTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', gap: 6, width: 40 },
  dayDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xpRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  xpTrack: { height: 16, borderRadius: 8, overflow: 'hidden' },
  xpFill: { height: 16, borderRadius: 8 },
  aiBorder: { borderRadius: 28, padding: 2.5 },
  aiInner: { borderRadius: 26, padding: 16, gap: 12 },
  aiHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  aiIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  betaPill: {
    alignSelf: 'flex-start',
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  promptChip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 14,
    justifyContent: 'center',
  },
  promo: {
    borderRadius: 28,
    borderBottomWidth: 6,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    gap: 8,
  },
  promoText: { flex: 1, gap: 6 },
  promoTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  promoCta: { alignSelf: 'flex-start', marginTop: 6 },
  promoPhotoWrap: { width: 112, height: 150, alignItems: 'center', justifyContent: 'center' },
  promoPhoto: {
    width: 104,
    height: 130,
    borderRadius: 20,
    borderWidth: 4,
    overflow: 'hidden',
    transform: [{ rotate: '7deg' }],
  },
  sticker: {
    position: 'absolute',
    left: -14,
    bottom: 2,
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-12deg' }],
  },
});
