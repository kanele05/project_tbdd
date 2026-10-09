import { CAPTCHA_PROVIDER } from '@/constants/config';

import type { RecaptchaWidgetProps } from './recaptcha';
import { RecaptchaWidget } from './RecaptchaWidget';
import { TurnstileWidget } from './TurnstileWidget';

export function CaptchaWidget(props: RecaptchaWidgetProps) {
  if (CAPTCHA_PROVIDER === 'recaptcha_v2') return <RecaptchaWidget {...props} />;
  return <TurnstileWidget {...props} />;
}
