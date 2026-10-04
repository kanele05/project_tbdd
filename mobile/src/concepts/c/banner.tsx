import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { FONT_C, PAD, T } from './theme';
import { Glass } from '../shared/Glass';
import { Icon } from '../shared/icons';
import { BANNER } from '../shared/mock';
import { Photo } from '../shared/Photo';

const VIOLET_DEEP = '#4B2FC9';

/** Promo banner: aurora gradient, a round photo "porthole" and a countdown glass chip. */
export function PromoBanner() {
  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={['#4F34E0', '#8B3FD8', '#B83DB4']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.banner}
      >
        <Svg width="100%" height="100%" style={styles.glowLayer}>
          <Defs>
            <RadialGradient id="bannerGlow" cx="85%" cy="5%" rx="70%" ry="80%">
              <Stop offset="0" stopColor="#7DF3E4" stopOpacity="0.55" />
              <Stop offset="1" stopColor="#7DF3E4" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="bannerGlow2" cx="0%" cy="100%" rx="60%" ry="60%">
              <Stop offset="0" stopColor="#FF8DBF" stopOpacity="0.5" />
              <Stop offset="1" stopColor="#FF8DBF" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#bannerGlow)" />
          <Rect width="100%" height="100%" fill="url(#bannerGlow2)" />
        </Svg>

        <View style={styles.porthole}>
          <Photo source={BANNER.photo} width={500} placeholderColor="#6B3FD8" />
        </View>
        <View style={styles.countdown}>
          <Glass
            intensity={30}
            tint="dark"
            fill="rgba(34,16,110,0.62)"
            borderColor="rgba(255,255,255,0.4)"
            radius={18}
            contentStyle={styles.countdownBody}
          >
            <Icon name="clock" size={14} color="#FFFFFF" strokeWidth={2.4} />
            <Text style={styles.countdownText}>2 ngày 14 giờ</Text>
          </Glass>
        </View>

        <View style={styles.copy}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{BANNER.title}</Text>
          </View>
          <T v="display" color="white" style={styles.title}>
            {BANNER.subtitle}
          </T>
          <T v="small" color="whiteSoft" numberOfLines={2}>
            {BANNER.caption}
          </T>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${BANNER.cta}: ${BANNER.title}`}
            style={styles.cta}
          >
            <Text style={styles.ctaText}>{BANNER.cta}</Text>
            <Icon name="arrowRight" size={16} color={VIOLET_DEEP} strokeWidth={2.6} />
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: PAD,
    marginTop: 22,
  },
  banner: {
    height: 210,
    borderRadius: 32,
    overflow: 'hidden',
    boxShadow: '0 14px 34px rgba(91,61,240,0.34)',
  },
  glowLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  porthole: {
    position: 'absolute',
    right: -34,
    top: 22,
    width: 172,
    height: 172,
    borderRadius: 86,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.6)',
    overflow: 'hidden',
  },
  countdown: { position: 'absolute', right: 40, bottom: 14 },
  countdownBody: {
    minHeight: 34,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countdownText: { fontFamily: FONT_C.bold, fontSize: 12, lineHeight: 16, color: '#FFFFFF' },
  copy: { flex: 1, width: 200, padding: 20, gap: 6, justifyContent: 'center' },
  tag: {
    alignSelf: 'flex-start',
    minHeight: 24,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
  },
  tagText: { fontFamily: FONT_C.bold, fontSize: 12, lineHeight: 16, color: VIOLET_DEEP },
  title: { fontSize: 29, lineHeight: 35 },
  cta: {
    alignSelf: 'flex-start',
    minHeight: 48,
    marginTop: 6,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ctaText: { fontFamily: FONT_C.bold, fontSize: 14, lineHeight: 18, color: VIOLET_DEEP },
});
