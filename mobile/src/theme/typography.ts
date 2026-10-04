import { BeVietnamPro_400Regular } from '@expo-google-fonts/be-vietnam-pro/400Regular';
import { BeVietnamPro_500Medium } from '@expo-google-fonts/be-vietnam-pro/500Medium';
import { BeVietnamPro_600SemiBold } from '@expo-google-fonts/be-vietnam-pro/600SemiBold';
import { BeVietnamPro_700Bold } from '@expo-google-fonts/be-vietnam-pro/700Bold';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display/700Bold';
import { PlayfairDisplay_700Bold_Italic } from '@expo-google-fonts/playfair-display/700Bold_Italic';
import { PlayfairDisplay_900Black } from '@expo-google-fonts/playfair-display/900Black';
import type { TextStyle } from 'react-native';

/**
 * Design tokens - typography (concept B "Noir").
 * - Display serif = Playfair Display (700 / 700 Italic / 900): ONLY for large titles (>= 18 dp).
 *   Its thick strokes and stacked Vietnamese diacritics blur below that size.
 * - Everything else = Be Vietnam Pro (400 / 500 / 600 / 700), designed for Vietnamese.
 * Custom fonts on Android do not honor `fontWeight`, so each weight is its own family name.
 *
 * The `heading*` tokens of phase 1 are kept (old call sites use `family="headingBold"` for prices
 * and names at small sizes) but now point at Be Vietnam Pro so small text never becomes serif.
 */
export const fontFamily = {
  /** Playfair Display 700: h1 / h2 / h3 titles, big prices. */
  display: 'PlayfairDisplay_700Bold',
  /** Playfair Display 700 italic: wordmark, "AI Tutor". */
  displayItalic: 'PlayfairDisplay_700Bold_Italic',
  /** Playfair Display 900: hero titles over photography. */
  displayBlack: 'PlayfairDisplay_900Black',
  /** Be Vietnam Pro 400: names on project cards (was Epilogue 400). */
  headingRegular: 'BeVietnamPro_400Regular',
  /** Be Vietnam Pro 600 (was Epilogue 600). */
  heading: 'BeVietnamPro_600SemiBold',
  /** Be Vietnam Pro 700 (was Epilogue 700): small prices, names. */
  headingBold: 'BeVietnamPro_700Bold',
  body: 'BeVietnamPro_400Regular',
  bodyMedium: 'BeVietnamPro_500Medium',
  bodySemiBold: 'BeVietnamPro_600SemiBold',
  bodyBold: 'BeVietnamPro_700Bold',
} as const;

export type FontFamilyToken = keyof typeof fontFamily;

/** Map passed to `useFonts` in the root layout. */
export const fontAssets = {
  PlayfairDisplay_700Bold,
  PlayfairDisplay_700Bold_Italic,
  PlayfairDisplay_900Black,
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
};

export type TextVariant =
  | 'hero'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'title'
  | 'cardTitle'
  | 'bodyLarge'
  | 'body'
  | 'label'
  | 'caption'
  | 'tab'
  | 'micro';

type TypeStyle = Pick<
  TextStyle,
  'fontFamily' | 'fontSize' | 'lineHeight' | 'letterSpacing' | 'fontVariant'
>;

/**
 * Lining figures: Playfair's default old-style numerals ("2.340") look like letters in prices.
 */
const LINING: TextStyle['fontVariant'] = ['lining-nums'];

/**
 * Type scale (concept B, sizes in dp; line height >= 1,4 so Vietnamese diacritics never clip):
 * - hero      38/44 Playfair 900  - hero title over a photo (once per screen)
 * - h1        28/36 Playfair 700  - screen / auth titles, big numbers
 * - h2        22/30 Playfair 700  - section titles ("Tiếp tục xem"), profile name
 * - h3        18/26 Playfair 700  - screen header titles, small section titles (the smallest serif)
 * - title     16/24 Be Vietnam 600 - list titles, settings group titles
 * - cardTitle 15/21 Be Vietnam 600 - course card title
 * - bodyLarge 16/26 Be Vietnam 400 - description paragraphs
 * - body      15/22 Be Vietnam 400 - default text
 * - label     14/20 Be Vietnam 600 - buttons, links, form labels
 * - caption   13/19 Be Vietnam 400 - teacher name, "4,8 (1233)", "A day ago"
 * - tab       15/21 Be Vietnam 600 - segmented tab labels (sentence case)
 * - micro     12/17 Be Vietnam 600 - tab bar label, badges
 */
export const typography: Record<TextVariant, TypeStyle> = {
  hero: {
    fontFamily: fontFamily.displayBlack,
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: -0.4,
    fontVariant: LINING,
  },
  h1: {
    fontFamily: fontFamily.display,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.2,
    fontVariant: LINING,
  },
  h2: { fontFamily: fontFamily.display, fontSize: 22, lineHeight: 30, fontVariant: LINING },
  h3: { fontFamily: fontFamily.display, fontSize: 18, lineHeight: 26, fontVariant: LINING },
  title: { fontFamily: fontFamily.heading, fontSize: 16, lineHeight: 24 },
  cardTitle: { fontFamily: fontFamily.heading, fontSize: 15, lineHeight: 21 },
  bodyLarge: { fontFamily: fontFamily.body, fontSize: 16, lineHeight: 26 },
  body: { fontFamily: fontFamily.body, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fontFamily.bodySemiBold, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fontFamily.body, fontSize: 13, lineHeight: 19 },
  tab: { fontFamily: fontFamily.bodySemiBold, fontSize: 15, lineHeight: 21 },
  micro: { fontFamily: fontFamily.bodySemiBold, fontSize: 12, lineHeight: 17, letterSpacing: 0.2 },
};
