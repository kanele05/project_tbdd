import { useMemo } from 'react';

import { useTheme, withAlpha } from '@/theme';

/** Colors of the nav content: white on the photo (transparent bar), theme colors on the solid bar. */
export type NavTone = {
  color: string;
  mutedColor: string;
  hoverBackground: string;
  fieldBackground: string;
  fieldBorder: string;
  placeholder: string;
};

export function useNavTone(isOnPhoto: boolean): NavTone {
  const { colors } = useTheme();
  return useMemo(
    () =>
      isOnPhoto
        ? {
            color: colors.white,
            mutedColor: withAlpha(colors.white, 0.82),
            hoverBackground: withAlpha(colors.white, 0.16),
            fieldBackground: withAlpha('#000000', 0.55),
            fieldBorder: withAlpha(colors.white, 0.7),
            placeholder: withAlpha(colors.white, 0.75),
          }
        : {
            color: colors.text,
            mutedColor: colors.textSecondary,
            hoverBackground: colors.surface,
            fieldBackground: colors.surface,
            fieldBorder: colors.border,
            placeholder: colors.placeholder,
          },
    [isOnPhoto, colors],
  );
}
