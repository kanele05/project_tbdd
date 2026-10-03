import { Epilogue_400Regular } from '@expo-google-fonts/epilogue/400Regular';
import { Epilogue_600SemiBold } from '@expo-google-fonts/epilogue/600SemiBold';
import { Epilogue_700Bold } from '@expo-google-fonts/epilogue/700Bold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import type { TextStyle } from 'react-native';

/**
 * Design tokens - typography. Heading = Epilogue (600/700), body = Inter (400/500/600).
 * Custom fonts on Android do not honor `fontWeight`, so each weight is its own family name.
 */
export const fontFamily = {
  /** Epilogue 400: names on Student project cards and resource rows (Projects design). */
  headingRegular: 'Epilogue_400Regular',
  heading: 'Epilogue_600SemiBold',
  headingBold: 'Epilogue_700Bold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
} as const;

export type FontFamilyToken = keyof typeof fontFamily;

/** Map passed to `useFonts` in the root layout. */
export const fontAssets = {
  Epilogue_400Regular,
  Epilogue_600SemiBold,
  Epilogue_700Bold,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
};

export type TextVariant =
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

type TypeStyle = Pick<TextStyle, 'fontFamily' | 'fontSize' | 'lineHeight' | 'letterSpacing'>;

/**
 * Type scale read from the 375 px design artboards (1 px = 1 dp):
 * - h1        24/32 Epilogue 700  - auth titles, big numbers
 * - h2        20/28 Epilogue 600  - "Hello, Rosie!", profile name
 * - h3        18/24 Epilogue 600  - section titles ("Categories"), screen header titles
 * - title     16/24 Epilogue 600  - course title on details, list titles
 * - cardTitle 14/20 Epilogue 600  - course card title
 * - bodyLarge 16/24 Inter 400     - description paragraphs
 * - body      14/20 Inter 400     - default text
 * - label     14/20 Inter 600     - buttons, chips, links ("View more")
 * - caption   12/16 Inter 400     - teacher name, "4.5 (1233)", "A day ago"
 * - tab       14/20 Inter 500     - segmented tab labels (uppercase applied by the component)
 * - micro     11/14 Inter 500     - bottom tab bar labels, badges
 */
export const typography: Record<TextVariant, TypeStyle> = {
  h1: { fontFamily: fontFamily.headingBold, fontSize: 24, lineHeight: 32 },
  h2: { fontFamily: fontFamily.heading, fontSize: 20, lineHeight: 28 },
  h3: { fontFamily: fontFamily.heading, fontSize: 18, lineHeight: 24 },
  title: { fontFamily: fontFamily.heading, fontSize: 16, lineHeight: 24 },
  cardTitle: { fontFamily: fontFamily.heading, fontSize: 14, lineHeight: 20 },
  bodyLarge: { fontFamily: fontFamily.body, fontSize: 16, lineHeight: 24 },
  body: { fontFamily: fontFamily.body, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fontFamily.bodySemiBold, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fontFamily.body, fontSize: 12, lineHeight: 16 },
  tab: { fontFamily: fontFamily.bodyMedium, fontSize: 14, lineHeight: 20, letterSpacing: 0.2 },
  micro: { fontFamily: fontFamily.bodyMedium, fontSize: 11, lineHeight: 14 },
};
