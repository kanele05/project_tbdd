import Feather from '@expo/vector-icons/Feather';

import type { FeatherIconName } from '@/components/ui';
import { categoryColors } from '@/theme';
import type { CategoryDto } from '@/types/api';

const FALLBACK_ICON: FeatherIconName = 'book-open';

/** `category.icon` is a free string from the API: only accept names that exist in Feather. */
export function toFeatherIcon(name: string): FeatherIconName {
  return name in Feather.glyphMap ? (name as FeatherIconName) : FALLBACK_ICON;
}

/**
 * Icon color: the hex sent by the API, else the design color for that category name, else
 * `fallback` (pass the theme's accent, e.g. `colors.primaryText`).
 */
export function getCategoryColor(
  category: Pick<CategoryDto, 'name' | 'color'>,
  fallback: string,
): string {
  return category.color || categoryColors[category.name.toLowerCase()] || fallback;
}
