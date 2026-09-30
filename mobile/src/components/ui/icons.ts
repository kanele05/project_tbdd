import type Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';

/** Valid icon names of the Feather set (the app's icon family, CLAUDE.md §3). */
export type FeatherIconName = ComponentProps<typeof Feather>['name'];
