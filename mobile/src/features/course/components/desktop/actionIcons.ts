import type { FeatherIconName } from '@/components/ui';

import type { CourseAction } from '../../courseAction';

/** Leading icon of the BR-17 button on the PC layout (hero and purchase card). */
export const ACTION_ICONS: Record<CourseAction, FeatherIconName> = {
  CONTINUE: 'play',
  OPEN_COURSE: 'play',
  ENROLL_FREE: 'unlock',
  GO_TO_CART: 'shopping-cart',
  ADD_TO_CART: 'shopping-cart',
};
