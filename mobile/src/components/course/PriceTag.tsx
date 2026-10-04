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
   * `stacked` - big "$59" with "20% Disc. ~~$73.75~~" underneath (course details bottom bar).
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
        <AppText variant="h3" color="text" family="headingBold">
          {priceText}
        </AppText>
        {hasDiscount ? (
          <View style={styles.row}>
            {discountPercent ? (
              <AppText variant="caption" color="textMuted">
                {t('priceTag.discShort', { percent: discountPercent })}
              </AppText>
            ) : null}
            <AppText variant="caption" color="textMuted" style={styles.strike}>
              {originalText}
            </AppText>
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
  inlinePrice: { fontSize: 14, lineHeight: 20 },
  strike: { textDecorationLine: 'line-through' },
});

export const PriceTag = memo(PriceTagBase);
