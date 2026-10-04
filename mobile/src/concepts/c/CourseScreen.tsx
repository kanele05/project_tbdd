import { Pressable, StyleSheet, View } from 'react-native';

import { AuroraBackground } from './Aurora';
import { AiSummary, CourseTabs, Overview } from './courseBody';
import { CourseHero, CourseInfo, CourseNav } from './courseHero';
import { Lessons, Reviews } from './courseLists';
import { GlassCard, GradButton } from './parts';
import { T, usePaletteC } from './theme';
import { useConceptEnv } from '../shared/env';
import { discountPercent, formatUsd } from '../shared/format';
import { Icon } from '../shared/icons';
import { DETAIL } from '../shared/mock';
import { FakeStatusBar, ScreenShell } from '../shared/ScreenShell';

/** Floating glass purchase bar: price, enrol button and "add to cart". */
function CtaBar() {
  const p = usePaletteC();
  const { bottomInset } = useConceptEnv();
  const { course } = DETAIL;
  const percent = discountPercent(course.priceCents, course.originalPriceCents);
  return (
    <View style={[styles.ctaWrap, { bottom: bottomInset + 6 }]}>
      <GlassCard isStrong radius={34} contentStyle={styles.cta}>
        <View style={styles.price}>
          <T v="h1" color="violetText">
            {formatUsd(course.priceCents)}
          </T>
          <View style={styles.row}>
            {course.originalPriceCents ? (
              <T v="small" color="muted" style={styles.strike}>
                {formatUsd(course.originalPriceCents)}
              </T>
            ) : null}
            {percent ? (
              <T v="tiny" color="pinkText">
                -{percent}%
              </T>
            ) : null}
          </View>
        </View>
        <GradButton label="Đăng ký học" height={56} style={styles.flex} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Thêm vào giỏ hàng"
          style={[styles.cart, { backgroundColor: p.chip, borderColor: p.hairline }]}
        >
          <Icon name="cart" size={24} color={p.violetText} strokeWidth={2.2} />
        </Pressable>
      </GlassCard>
    </View>
  );
}

export function CourseScreenC() {
  const p = usePaletteC();
  return (
    <ScreenShell backgroundColor={p.bgSolid} background={<AuroraBackground />} footer={<CtaBar />}>
      <FakeStatusBar color={p.text} />
      <CourseNav />
      <CourseHero />
      <CourseInfo />
      <CourseTabs />
      <Overview />
      <AiSummary />
      <Lessons />
      <Reviews />
      <View style={styles.tail} />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tail: { height: 130 },
  ctaWrap: { position: 'absolute', left: 14, right: 14 },
  cta: { padding: 10, paddingLeft: 18, flexDirection: 'row', alignItems: 'center', gap: 10 },
  price: { minWidth: 76 },
  strike: { textDecorationLine: 'line-through' },
  cart: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
