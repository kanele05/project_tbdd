import { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTranslation } from '@/i18n';
import { spacing } from '@/theme';
import { formatPrice } from '@/utils/formatPrice';

export type PriceTagProps = {
  priceCents: number;
  /** Original price; shown struck through when higher than `priceCents`. */
  originalPriceCents?: number | null;
  /**
   * `inline`  - "$59  ~~$73.75~~" on one line (cards).
   * `stacked` - big serif "$59" with a gold "20% Disc." and ~~$73.75~~ underneath (course CTA bar).
   */
  layout?: 'inline' | 'stacked';
  /** Text for a zero price. Default: the translated "Free". */
  freeLabel?: string;
  /** Only used by the `stacked` layout: "80% Disc.". */
  discountPercent?: number | null;
  style?: StyleProp<ViewStyle>;
};

/** Primary-colored price with an optional struck-through original price. */
function PriceTagBase({
  priceCents,
  originalPriceCents,
  layout = 'inline',
  freeLabel,
  discountPercent,
  style,
}: PriceTagProps) {
  const { t } = useTranslation();
  const hasDiscount = originalPriceCents != null && originalPriceCents > priceCents;
  const priceText = priceCents <= 0 ? (freeLabel ?? t('free')) : formatPrice(priceCents);
  const originalText = hasDiscount ? formatPrice(originalPriceCents) : null;
  const a11y = hasDiscount
    ? t('priceTag.was', { price: priceText, original: originalText })
    : priceText;

  if (layout === 'stacked') {
    return (
      <View style={style} accessible accessibilityLabel={a11y}>
        <AppText variant="h2" color="text" style={styles.stackedPrice}>
          {priceText}
        </AppText>
        {hasDiscount ? (
          <View style={styles.row}>
            <AppText variant="caption" color="textMuted" style={styles.strike}>
              {originalText}
            </AppText>
            {discountPercent ? (
              <AppText variant="caption" color="goldText" family="bodySemiBold">
                {t('priceTag.discShort', { percent: discountPercent })}
              </AppText>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.row, style]} accessible accessibilityLabel={a11y}>
      <AppText variant="title" color="primaryText" family="headingBold" style={styles.inlinePrice}>
        {priceText}
      </AppText>
      {hasDiscount ? (
        <AppText variant="caption" color="textMuted" style={styles.strike}>
          {originalText}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  inlinePrice: { fontSize: 15, lineHeight: 20 },
  stackedPrice: { fontSize: 26, lineHeight: 32 },
  strike: { textDecorationLine: 'line-through' },
});

export const PriceTag = memo(PriceTagBase);
